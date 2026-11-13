import express from 'express';
import { rateLimit } from 'express-rate-limit';
import OpenAI from 'openai';
import { z } from 'zod';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateItinerary, PlannerError } from './generateItinerary.js';
import { PlannerRequestSchema } from '../shared/itinerary.js';
import { LocationQuerySchema } from '../shared/map.js';
import { geocodeLocation } from './geocodeLocation.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));

if (process.env.NODE_ENV === 'production') {
  // shortcut: limits reset on restart; use a shared store before scaling.
  app.use(
    '/api/itinerary',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 20,
      // One shared allowance protects the demo without trusting proxy IP headers.
      keyGenerator: () => 'itinerary',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: {
          code: 'REQUEST_LIMIT_REACHED',
          message: 'The planner has reached its hourly request limit. Please try again later.',
        },
      },
    }),
  );
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/location', async (request, response) => {
  const query = LocationQuerySchema.safeParse(request.query.query);
  if (!query.success) {
    response
      .status(400)
      .json({ error: { code: 'INVALID_LOCATION', message: 'Enter a valid location.' } });
    return;
  }
  const controller = new AbortController();
  function cancelDisconnectedLookup() {
    if (!response.writableEnded) controller.abort();
  }
  response.on('close', cancelDisconnectedLookup);
  try {
    const location = await geocodeLocation(query.data, controller.signal);
    if (!controller.signal.aborted) response.json({ location });
  } catch (error) {
    if (controller.signal.aborted) return;
    const safeError =
      error instanceof PlannerError
        ? error
        : new PlannerError(
            503,
            'MAP_LOOKUP_FAILED',
            'Map locations could not be loaded. Try again.',
          );
    response
      .status(safeError.status)
      .json({ error: { code: safeError.code, message: safeError.message } });
  } finally {
    response.off('close', cancelDisconnectedLookup);
  }
});

app.post('/api/itinerary', async (request, response) => {
  const checkedRequest = PlannerRequestSchema.safeParse(request.body);
  if (!checkedRequest.success) {
    response.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Describe a trip or enter a valid refinement instruction.',
      },
    });
    return;
  }

  const controller = new AbortController();
  function cancelDisconnectedRequest() {
    if (!response.writableEnded) controller.abort();
  }
  response.on('close', cancelDisconnectedRequest);

  try {
    const itinerary = await generateItinerary(checkedRequest.data, controller.signal);
    if (!controller.signal.aborted) response.json({ itinerary });
  } catch (error) {
    if (controller.signal.aborted) return;
    const safeError =
      error instanceof PlannerError
        ? error
        : new PlannerError(
            500,
            'SERVER_ERROR',
            'Something went wrong on the server. Please try again.',
            { cause: error },
          );
    const originalError = safeError.cause ?? safeError;
    // Log diagnostic metadata only: never the exception object, message, headers, or input.
    console.error('Trip planner request failed', {
      operation: checkedRequest.data.mode,
      code: safeError.code,
      status: safeError.status,
      errorClass: originalError instanceof Error ? originalError.constructor.name : 'UnknownError',
      providerStatus: originalError instanceof OpenAI.APIError ? originalError.status : undefined,
      validationPaths:
        originalError instanceof z.ZodError
          ? originalError.issues.map((issue) => issue.path.join('.') || '<root>')
          : undefined,
    });
    response
      .status(safeError.status)
      .json({ error: { code: safeError.code, message: safeError.message } });
  } finally {
    response.off('close', cancelDisconnectedRequest);
  }
});

// The production build shares this origin with the API; no CORS setup is needed.
app.use(express.static(resolve('dist/client')));
app.use(
  (
    error: { type?: string },
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error.type === 'entity.too.large') {
      response.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'This request is too large. Try a shorter trip description.',
        },
      });
      return;
    }
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request was not valid JSON. Please try again.',
      },
    });
  },
);

// Importing app in a test must not open a port. Running this file does.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => {
    console.log(`Trip planner API: http://${host}:${port}`);
  });
}
