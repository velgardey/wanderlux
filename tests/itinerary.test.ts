import { describe, expect, it } from 'vitest';
import {
  GeneratedItinerarySchema,
  EditableItinerarySchema,
  PlannerRequestSchema,
} from '../shared/itinerary.js';
import { createItinerary } from './fixtures/itineraries.js';

describe('itinerary boundaries', () => {
  it('accepts a complete itinerary', () => {
    expect(GeneratedItinerarySchema.safeParse(createItinerary()).success).toBe(true);
  });

  it('rejects duplicate stop IDs across days', () => {
    const itinerary = createItinerary();
    itinerary.days[1].stops[0].id = itinerary.days[0].stops[0].id;
    expect(GeneratedItinerarySchema.safeParse(itinerary).success).toBe(false);
  });

  it.each([null, {}, { days: [] }])('rejects incomplete output: %j', (value) => {
    expect(GeneratedItinerarySchema.safeParse(value).success).toBe(false);
  });

  it('allows a user to empty a day without allowing empty generated days', () => {
    const itinerary = createItinerary();
    itinerary.days[0].stops = [];
    expect(GeneratedItinerarySchema.safeParse(itinerary).success).toBe(false);
    expect(EditableItinerarySchema.safeParse(itinerary).success).toBe(true);
  });

  it('rejects invalid duration and day ordering', () => {
    const itinerary = createItinerary();
    itinerary.days[0].stops[0].durationMinutes = -10;
    expect(GeneratedItinerarySchema.safeParse(itinerary).success).toBe(false);
    itinerary.days[0].stops[0].durationMinutes = 90;
    itinerary.days[1].dayNumber = 4;
    expect(GeneratedItinerarySchema.safeParse(itinerary).success).toBe(false);
  });

  it('rejects unknown block types and extra fields', () => {
    const itinerary = createItinerary();
    expect(
      GeneratedItinerarySchema.safeParse({
        ...itinerary,
        blocks: [{ type: 'executable', code: 'alert(1)' }],
      }).success,
    ).toBe(false);
    expect(GeneratedItinerarySchema.safeParse({ ...itinerary, unexpected: true }).success).toBe(
      false,
    );
  });

  it('rejects duplicate checklist item IDs and oversized day arrays', () => {
    const itinerary = createItinerary();
    const checklist = itinerary.blocks.find((block) => block.type === 'checklist')!;
    checklist.items![1].id = checklist.items![0].id;
    expect(GeneratedItinerarySchema.safeParse(itinerary).success).toBe(false);
    expect(
      GeneratedItinerarySchema.safeParse({
        ...createItinerary(),
        days: Array(8).fill(createItinerary().days[0]),
      }).success,
    ).toBe(false);
  });

  it('rejects blank prompts before any provider call', () => {
    expect(PlannerRequestSchema.safeParse({ mode: 'generate', prompt: '   ' }).success).toBe(false);
    expect(
      PlannerRequestSchema.safeParse({
        mode: 'refine',
        instruction: 'less walking',
        itinerary: null,
      }).success,
    ).toBe(false);
  });
});
