// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index.js';
import { createItinerary } from './fixtures/itineraries.js';
import { PlannerRequestSchema } from '../shared/itinerary.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('HTTP trust boundary', () => {
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
