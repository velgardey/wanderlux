// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.js';
import { createItinerary } from './fixtures/itineraries.js';
import { PlannerRequestSchema } from '../shared/itinerary.js';
import { providerResponse } from './fixtures/providerResponse.js';
import { request as openHttpRequest } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('HTTP trust boundary', () => {
  it('aborts the provider signal when the browser disconnects', async () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.services.ai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-luna');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    let providerSignal: AbortSignal | undefined;
    let rejectProvider: ((error: Error) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, options) => {
        providerSignal = options.signal;
        return new Promise((_resolve, reject) => {
          rejectProvider = reject;
          options.signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      }),
    );
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const browserRequest = openHttpRequest({
      host: '127.0.0.1',
      port: address.port,
      path: '/api/itinerary',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    // Closing a request intentionally can emit ECONNRESET on the client socket.
    browserRequest.on('error', () => {});
    try {
      browserRequest.end(JSON.stringify({ mode: 'generate', prompt: 'Jaipur' }));
      await vi.waitFor(() => expect(providerSignal).toBeDefined());
      expect(providerSignal?.aborted).toBe(false);
      browserRequest.destroy();
      await vi.waitFor(() => expect(providerSignal?.aborted).toBe(true));
      expect(console.error).not.toHaveBeenCalled();
    } finally {
      browserRequest.destroy();
      rejectProvider?.(new DOMException('Test finished', 'AbortError'));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not abort the provider after a normal successful response', async () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.services.ai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-luna');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    let providerSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, options) => {
        providerSignal = options.signal;
        return providerResponse(JSON.stringify(createItinerary()));
      }),
    );
    const response = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: 'Jaipur' });
    expect(response.status).toBe(200);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(providerSignal?.aborted).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs a sanitized provider failure without logging private payloads or headers', async () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.services.ai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-luna');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'private-test-key');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { message: 'PRIVATE_PROVIDER_BODY', code: 'PRIVATE_PROVIDER_CODE' },
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json', 'x-request-id': 'PRIVATE_HEADER' },
            },
          ),
        ),
    );
    const response = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: 'PRIVATE_USER_BRIEF' });
    expect(response.status).toBe(503);
    expect(console.error).toHaveBeenCalledWith('Trip planner request failed', {
      operation: 'generate',
      code: 'PROVIDER_FAILED',
      status: 503,
      errorClass: 'AuthenticationError',
      providerStatus: 401,
      validationPaths: undefined,
    });
    const exposedText = JSON.stringify(vi.mocked(console.error).mock.calls) + response.text;
    for (const privateText of [
      'PRIVATE_PROVIDER_BODY',
      'PRIVATE_PROVIDER_CODE',
      'PRIVATE_HEADER',
      'PRIVATE_USER_BRIEF',
      'private-test-key',
    ]) {
      expect(exposedText).not.toContain(privateText);
    }
  });

  it('logs validation field paths without logging the invalid model values', async () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.services.ai.azure.com/openai/v1');
    vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-luna');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'private-test-key');
    const itinerary = createItinerary();
    itinerary.days[0].stops[0].durationMinutes = 0;
    itinerary.days[0].stops[0].description = 'PRIVATE_MODEL_TEXT';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify(itinerary))));
    const response = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: 'Jaipur' });
    expect(response.status).toBe(502);
    expect(console.error).toHaveBeenCalledWith('Trip planner request failed', {
      operation: 'generate',
      code: 'INVALID_OUTPUT',
      status: 502,
      errorClass: 'ZodError',
      providerStatus: undefined,
      validationPaths: ['days.0.stops.0.durationMinutes'],
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls) + response.text).not.toContain(
      'PRIVATE_MODEL_TEXT',
    );
  });

  it('rejects invalid input without contacting Azure', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: ' ' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles malformed JSON and oversized bodies safely', async () => {
    const malformed = await request(app)
      .post('/api/itinerary')
      .set('Content-Type', 'application/json')
      .send('{broken');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
    const oversized = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: 'x'.repeat(524_289) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('REQUEST_TOO_LARGE');
  });

  it('returns a safe configuration error without exposing a key', async () => {
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
    const response = await request(app)
      .post('/api/itinerary')
      .send({ mode: 'generate', prompt: 'Jaipur' });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NOT_CONFIGURED');
    expect(response.text).not.toContain(process.env.AZURE_OPENAI_API_KEY || 'unexpected-secret');
  });

  it('permits a refinement at every field bound, including escaped Unicode', async () => {
    const fill = (length: number) => '旅\u0000'.repeat(length).slice(0, length);
    const itinerary = {
      title: fill(160),
      assumptions: Array(5).fill(fill(240)),
      days: Array.from({ length: 7 }, (_, dayIndex) => ({
        dayNumber: dayIndex + 1,
        title: fill(120),
        stops: Array.from({ length: 8 }, (_, stopIndex) => ({
          id: `s-${dayIndex}-${stopIndex}`,
          title: fill(120),
          description: fill(800),
          location: fill(200),
          durationMinutes: 720,
        })),
      })),
      blocks: Array.from({ length: 3 }, (_, blockIndex) => ({
        type: 'checklist',
        id: `block-${blockIndex}`,
        title: fill(120),
        items: Array.from({ length: 12 }, (_, itemIndex) => ({
          id: `i-${blockIndex}-${itemIndex}`,
          label: fill(160),
        })),
      })),
    };
    const body = { mode: 'refine', instruction: fill(2000), itinerary };
    expect(PlannerRequestSchema.safeParse(body).success).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(524_288);
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', '');
    const response = await request(app).post('/api/itinerary').send(body);
    // Configuration is checked after body/schema validation, proving the request fits.
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NOT_CONFIGURED');
  });
});
