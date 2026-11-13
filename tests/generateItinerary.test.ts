// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateItinerary } from '../server/generateItinerary.js';
import { createItinerary } from './fixtures/itineraries.js';

function providerResponse(text: string, status = 'completed') {
  return new Response(
    JSON.stringify({
      id: 'response-test',
      object: 'response',
      status,
      output: [
        {
          id: 'message-test',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text, annotations: [] }],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

beforeEach(() => {
  vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.services.ai.azure.com/openai/v1');
  vi.stubEnv('AZURE_OPENAI_DEPLOYMENT', 'gpt-6-luna');
  vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key-not-a-real-secret');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Azure Responses integration', () => {
  it('parses a real-shaped Responses envelope and sends the deployment/schema', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(providerResponse(JSON.stringify(createItinerary())));
    vi.stubGlobal('fetch', fetchMock);
    const itinerary = await generateItinerary(
      { mode: 'generate', prompt: 'Two days in Jaipur' },
      new AbortController().signal,
    );
    expect(itinerary.title).toBe('Three days in Jaipur');
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://test.services.ai.azure.com/openai/v1/responses');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-6-luna');
    expect(body.text.format.type).toBe('json_schema');
    expect(body.store).toBe(false);
  });

  it.each(['{bad json', '{}', 'null', ''])('handles unusable model output: %j', async (text) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(text)));
    await expect(
      generateItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('rejects duplicate IDs even when the shape is correct', async () => {
    const itinerary = createItinerary();
    itinerary.days[1].stops[0].id = itinerary.days[0].stops[0].id;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify(itinerary))));
    await expect(
      generateItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('rejects incomplete responses instead of committing a partial trip', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(providerResponse(JSON.stringify(createItinerary()), 'incomplete')),
    );
    await expect(
      generateItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('validates requests before calling Azure', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      generateItinerary({ mode: 'generate', prompt: ' ' }, new AbortController().signal),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a safe rate-limit message without leaking the provider body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: 'private provider diagnostics',
              type: 'rate_limit',
              code: 'rate_limit',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await expect(
      generateItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toMatchObject({
      status: 429,
      message: 'The AI service is busy. Please try again later.',
    });
  });

  it('reports missing configuration without calling the provider', async () => {
    vi.stubEnv('AZURE_OPENAI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      generateItinerary({ mode: 'generate', prompt: 'Jaipur' }, new AbortController().signal),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows an intentionally empty edited day during refinement', async () => {
    const itinerary = createItinerary();
    itinerary.days[0].stops = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify(itinerary))));
    await expect(
      generateItinerary(
        { mode: 'refine', instruction: 'Keep day one empty', itinerary },
        new AbortController().signal,
      ),
    ).resolves.toEqual(itinerary);
  });
});
