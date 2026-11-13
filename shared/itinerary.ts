import { z } from 'zod';

// Bounds keep unpredictable model output small enough to render and send back for refinement.
const IdentifierSchema = z.string().trim().min(1).max(80);
const ShortTitleSchema = z.string().trim().min(1).max(120);

export const StopSchema = z.strictObject({
  id: IdentifierSchema,
  title: ShortTitleSchema,
  description: z.string().trim().min(1).max(800),
  location: z.string().trim().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(720),
});

const TipBlockSchema = z.strictObject({
  type: z.literal('card'),
  id: IdentifierSchema,
  title: ShortTitleSchema,
  text: z.string().trim().min(1).max(500),
});
const ChecklistBlockSchema = z.strictObject({
  type: z.literal('checklist'),
  id: IdentifierSchema,
  title: ShortTitleSchema,
  items: z
    .array(
      z.strictObject({
        id: IdentifierSchema,
        label: z.string().trim().min(1).max(160),
      }),
    )
    .min(1)
    .max(12),
});
const ChartBlockSchema = z.strictObject({
  type: z.literal('chart'),
  id: IdentifierSchema,
  title: ShortTitleSchema,
  metric: z.literal('activityMinutes'),
});
export const ResultBlockSchema = z.union([TipBlockSchema, ChecklistBlockSchema, ChartBlockSchema]);

function createItineraryStructure(minimumStops: number) {
  return z.strictObject({
    title: z.string().trim().min(1).max(160),
    assumptions: z.array(z.string().trim().min(1).max(240)).max(5),
    days: z
      .array(
        z.strictObject({
          dayNumber: z.number().int().min(1).max(7),
          title: ShortTitleSchema,
          stops: z.array(StopSchema).min(minimumStops).max(8),
        }),
      )
      .min(1)
      .max(7),
    blocks: z.array(ResultBlockSchema).max(3),
  });
}

// Azure receives the structural schema. Cross-field checks still run locally after parsing.
export const GeneratedItineraryStructure = createItineraryStructure(1);
export const EditableItineraryStructure = createItineraryStructure(0);
export type Itinerary = z.infer<typeof EditableItineraryStructure>;
export type Stop = z.infer<typeof StopSchema>;
export type ResultBlock = z.infer<typeof ResultBlockSchema>;

function checkUniqueIds(ids: string[], label: string, context: z.RefinementCtx) {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', message: `${label} IDs must be unique.` });
  }
}

function checkItineraryRelationships(itinerary: Itinerary, context: z.RefinementCtx) {
  const stopIds = itinerary.days.flatMap((day) => day.stops.map((stop) => stop.id));
  const blockIds = itinerary.blocks.map((block) => block.id);
  const checklistItemIds = itinerary.blocks.flatMap((block) => {
    return block.type === 'checklist' ? block.items.map((item) => item.id) : [];
  });
  checkUniqueIds(stopIds, 'Stop', context);
  checkUniqueIds(blockIds, 'Block', context);
  checkUniqueIds(checklistItemIds, 'Checklist item', context);
  itinerary.days.forEach((day, index) => {
    if (day.dayNumber !== index + 1) {
      context.addIssue({
        code: 'custom',
        message: 'Day numbers must start at one and stay consecutive.',
      });
    }
  });
}

export const GeneratedItinerarySchema = GeneratedItineraryStructure.superRefine(
  checkItineraryRelationships,
);
export const EditableItinerarySchema = EditableItineraryStructure.superRefine(
  checkItineraryRelationships,
);
const PromptSchema = z.string().trim().min(1).max(2000);
export const PlannerRequestSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('generate'), prompt: PromptSchema }),
  z.strictObject({
    mode: z.literal('refine'),
    instruction: PromptSchema,
    itinerary: EditableItinerarySchema,
  }),
]);
export type PlannerRequest = z.infer<typeof PlannerRequestSchema>;
export const SuccessResponseSchema = z.strictObject({ itinerary: EditableItinerarySchema });
export const ErrorResponseSchema = z.strictObject({
  error: z.strictObject({ code: z.string(), message: z.string().min(1).max(500) }),
});
export const SavedSessionSchema = z.strictObject({
  version: z.literal(1),
  id: IdentifierSchema,
  savedAt: z.iso.datetime(),
  prompt: PromptSchema,
  itinerary: EditableItinerarySchema,
  checkedItemIds: z.array(IdentifierSchema).max(36),
});
export const SavedSessionsSchema = z.array(SavedSessionSchema).max(5);
export type SavedSession = z.infer<typeof SavedSessionSchema>;
