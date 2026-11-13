# Read, explain, and extend this project

This is a guide to the actual code. Read the files in this order. The decision log explains alternatives; this document explains how the pieces cooperate.

## 1. Start at the screen: `src/App.tsx`

`App` owns the text currently being typed, the refinement text, local save notices, and the theme. These are screen concerns. It calls `usePlanner` for the itinerary and request behavior, then passes data and callbacks to components.

`draftPrompt` is what the textarea currently says. `planner.prompt` is the brief belonging to the last successful itinerary. They are deliberately different: typing a new brief or failing a new request must not attach that new brief to the older trip when it is saved.

The submit handlers call `event.preventDefault()` because we want React to handle the form instead of reloading the page. `void planner.generate(...)` starts an async operation whose success/error is managed by the hook. The screen does not need to await it to redraw; state updates cause rendering.

The initial saved-trip read happens in a lazy state initializer. Its try/catch stops corrupted browser data from crashing the screen. Save creates a snapshot containing the last successful prompt, current edits, and checklist state. The hook's session ID makes subsequent saves update the same session rather than creating duplicates.

## 2. Understand the contract: `shared/itinerary.ts`

The model, API, local storage, and React all agree on the same fields. Zod schemas describe accepted runtime values; `z.infer` produces TypeScript types from them, so types and validators cannot accidentally drift apart.

Strict objects reject unexpected fields. String/array/number bounds keep results manageable. A union represents the three block variants. Checking `block.type` tells TypeScript which other fields exist: a checklist has items, a card has text, and a chart has an activity-time metric.

There are two itinerary schemas with one important difference:

- A freshly generated day must have at least one stop.
- An edited day may have zero stops because the user is allowed to remove them all.

Reusing the generated minimum for storage/refinement would reject a perfectly valid user edit. The shared structural factory varies only that minimum. `checkItineraryRelationships` adds checks that a provider schema cannot express conveniently: unique IDs and consecutive days.

The structural schemas are sent to Azure. The completed result then receives the full local validation. Schema-valid means the UI can handle the data; it does not mean a tourist attraction is actually open.

## 3. Follow the request: `src/lib/api.ts`

This function calls our server, never Azure directly. Native browser fetch is enough for one internal JSON endpoint. It sends the request object, accepts a cancellation signal, and adds a 35-second timeout.

The server may return a JSON error, but a proxy can return an HTML failure. That is why response parsing is guarded and why raw response bodies never become screen text. A successful HTTP status is not enough: the success envelope must pass the runtime schema before returning an itinerary.

## 4. The most important file: `src/hooks/usePlanner.ts`

The hook owns the last valid itinerary, request status/error, committed prompt, expansion/checklist IDs, and saved-session ID. State is for values that render. Refs are for immediate request bookkeeping that should not wait for another render.

For every new request:

1. Validate the request.
2. Abort the previous controller.
3. Increment the request number and keep this request's number.
4. Mark the operation loading while retaining the previous valid itinerary.
5. Wait for the API.
6. Compare request numbers before committing success or error.

Suppose request A starts, then B starts. B completes first. A can still arrive even after abort. A's number is older, so the hook ignores it. The same check protects errors and final cleanup. Otherwise A could clear B's loading state or replace B's trip.

Cancel, unmount, and session load invalidate the request number. Stop mutations are blocked while a request is pending, preventing the completed AI snapshot from overwriting edits made mid-request.

On failure, the previous itinerary stays in state and the failed request is saved for explicit Retry. A later removal, reorder, session load, cancel, or new request clears that snapshot. Otherwise retrying an old refinement could restore a stop the user has since removed.

Refinement submits the current edited itinerary. It commits a full validated replacement only on success. Expansion and checklist state are retained for IDs that survive. New generation clears those presentation states and starts a new saved-session identity.

## 5. Local operations: `src/lib/itinerary.ts`

`removeStop` filters the requested ID out of each day's stop list and returns copied data. `moveStop` finds the stop and its day, checks the destination index, copies the list, swaps two items, and returns a copied itinerary.

Why copying? React state must not be mutated in place, and the failed request snapshot may still refer to the previous itinerary object. Mutating it would change the supposedly saved snapshot as well. The tests keep the original data and prove it remains unchanged.

Moves are only within a day. Out-of-range moves return the original object. Move buttons at the first/last positions are disabled, so the boundary check protects both the UI and future callers.

## 6. The server: `server/index.ts`

Express parses JSON with a bounded body size, validates the request, and calls `generateItinerary`. It converts deliberately safe `PlannerError` instances into short JSON error envelopes. Malformed JSON and oversized bodies receive errors instead of crashing.

When the browser disconnects before the response is finished, the server aborts the provider request. The listener is removed afterwards. The production build serves client files from the same origin, avoiding unnecessary CORS configuration.

The module exports `app` for Supertest without opening a port on import. The main-file check opens a port only when the server is run directly. This keeps tests reproducible and prevents accidental listening during imports.

## 7. The model call: `server/generateItinerary.ts`

This file reads Azure settings from the server environment. The key is never returned to React. The endpoint and deployment are the values the user supplied.

Microsoft's examples use the official OpenAI SDK with the Azure v1 endpoint. `zodTextFormat` converts the structural schema to the provider's strict JSON format, and `responses.parse` extracts/parses the result. This saves us from writing a custom Responses envelope parser. We still reject incomplete/empty responses and run the relationship checks locally.

The prompt explains the required shape, travel limits, assumptions, and refinement behavior. A refinement input contains the **current** edited itinerary rather than the original response. IDs are preserved when possible so local presentation state can survive.

The SDK timeout is 30 seconds and automatic retries are off. Errors become messages we wrote ourselves; provider diagnostics, keys, and stacks are not echoed. Abort is best effort: it protects our app state and network work but cannot guarantee the provider stops processing or charging.

## 8. Components render data, not raw AI text

- `Itinerary.tsx` groups days, calculates activity totals, and passes stop callbacks. It restores focus to the day heading after removing a button.
- `StopCard.tsx` owns no itinerary data. It renders a stop and calls its props. React-generated DOM IDs connect the expansion button to details without trusting a model ID as a DOM identifier.
- `ResultBlocks.tsx` renders each known union variant. Checkboxes are controlled by local checked IDs. Chart bars derive from current durations, so removing a stop updates the chart.
- `EmptyItinerary.tsx` is the initial/loading-empty state. It contains no fake itinerary or substitute model response.

The Lucide icon library supplies a consistent icon set rather than hand-maintained SVG paths for every button. Icons are decorative when the button already has text or an accessible name. CSS tokens in `styles.css` make theme changes understandable: components use `--text`, `--surface`, `--line`, and `--accent` instead of duplicating colors.

## 9. Browser storage: `src/lib/storage.ts`

Local storage is an untrusted boundary because it can be corrupted or edited. Reading parses and validates the versioned array. Saving validates the session, updates an existing ID, and keeps at most five most recent saves.

Invalid data is not silently deleted. The screen reports the error and offers an explicit reset, with confirmation, for this app's key only. Denied writes return a notice and leave the working itinerary intact.

## 10. How tests help you explain this

`tests/fixtures/itineraries.ts` creates small deterministic example data. The working app does not use those fixtures. Logic tests check validation and immutable edits. Testing Library checks hook behavior with controlled promises, and screen tests click the actual React controls. Supertest checks HTTP parsing/error boundaries. Playwright checks the rendered app in installed Chrome on desktop and mobile.

Mocks are at the network/provider boundary so failures are reproducible and tests do not consume quota. Live generation/refinement are checked separately. Read the race-condition tests first if you need to explain the most valuable reliability behavior in an interview.

## Small extension exercises

### Add a stop category

Add a bounded category enum to `StopSchema`, update provider instructions, render the field in `StopCard`, and update fixtures plus one test. The generated and editable schemas inherit the same field automatically. If old saved sessions must remain loadable, explicitly migrate version 1 or make the new field backward-compatible; do not silently pretend an old version has it.

### Add a new result block

Add its strict schema to `ResultBlockSchema`, add its TypeScript-narrowed renderer in `ResultBlocks`, tell the provider when to return it, and test both valid and invalid examples. Keep derived totals in code when they depend on user edits.

### Add restore/remove

Keep a small removed-stop record containing the stop and its day/index, provide a Restore action, and clear obsolete retries. Restore by copying data and enforce the eight-stop bound. Do not store it in the model contract unless refinement needs it.

### Move stops between days

Extend the pure edit operation to remove from a source day and insert in a chosen target day. Enforce destination capacity, preserve the stop ID, invalidate Retry, and test that neither day's original arrays mutate. Start with a labelled day selector; drag-and-drop can come later if it materially improves usability.

### Change the model deployment

Change the server environment setting, confirm the deployment supports Responses and structured outputs, and run one live smoke test. The React components and API request shape should not need to change. A provider abstraction becomes useful only when more than one provider is actually supported.
