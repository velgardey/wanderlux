import {
  SuccessResponseSchema,
  ErrorResponseSchema,
  type PlannerRequest,
  type Itinerary,
} from '../../shared/itinerary.js';
import { clientTimeoutMs } from '../../shared/requestLimits.js';

export async function requestItinerary(
  request: PlannerRequest,
  signal: AbortSignal,
): Promise<Itinerary> {
  const timeoutSignal = AbortSignal.timeout(clientTimeoutMs);
  const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
  let response: Response;
  try {
    response = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: combinedSignal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (timeoutSignal.aborted)
      throw new Error('This is taking too long. Try again.', { cause: error });
    throw new Error('Could not reach the server. Check your connection and try again.', {
      cause: error,
    });
  }

  // Proxies sometimes return HTML rather than our JSON error envelope.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (signal.aborted) throw new Error('Request cancelled.', { cause: error });
    if (timeoutSignal.aborted)
      throw new Error('This is taking too long. Try again.', { cause: error });
    throw new Error(
      response.ok
        ? 'The server returned an itinerary we could not use.'
        : 'The request failed. Please try again.',
      { cause: error },
    );
  }

  if (!response.ok) {
    const checkedError = ErrorResponseSchema.safeParse(payload);
    const message = checkedError.success
      ? checkedError.data.error.message
      : 'The request failed. Please try again.';
    throw new Error(message, {
      cause: {
        status: response.status,
        code: checkedError.success ? checkedError.data.error.code : 'INVALID_ERROR_RESPONSE',
      },
    });
  }
  const checkedResponse = SuccessResponseSchema.safeParse(payload);
  if (!checkedResponse.success)
    throw new Error('The server returned an itinerary we could not use.', {
      cause: checkedResponse.error,
    });
  return checkedResponse.data.itinerary;
}
