# Basic Trip Planner Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Checkboxes track progress. This deliverable is a plan; it does not authorize implementation, installation, publishing, or deletion of existing material.

**Later implementation update:** The user subsequently authorized building this plan and selected Azure GPT 6 Luna through the Responses API instead of Gemini. The local implementation and recommended extras are complete; see `docs/BUILD_LOG.md`, `docs/DECISIONS.md`, and `README.md` for actual code, verification, and deferred scope. The original estimates and provider proposal below are preserved as planning history.

**Goal:** Build a small React trip planner that converts a free-form trip description into a reliable, editable day-by-day itinerary and fits the assignment's eight-hour work limit.

**Architecture:** A Vite React client calls a small same-origin Node/Express API. The API calls Gemini, parses and validates its output, and returns a typed itinerary. React owns itinerary edits and request state; browser storage handles saved sessions.

**Tech stack:** React functional components and hooks, TypeScript, Vite, plain CSS, Node/Express, the official `@google/genai` SDK, Zod for runtime validation, and repository-local Vitest and Playwright Test. Use pnpm and preserve existing lockfiles if any are retained at implementation time.

**Spec:** The project specification and acceptance criteria are included below. Source: `C:/Users/deymr/Downloads/Frontend_Internship_Assignment.pdf`, pages 1-4. User direction: a basic trip planner; use this assignment as the only project reference; prioritize recommended optional goals within eight hours.

## Global constraints

- React with hooks and functional components is mandatory; TypeScript is my recommendation, not an assignment requirement.
- Use a real model for the working app. Fixtures are allowed for tests, not as a substitute for live AI integration.
- Structured data must become interactive components. A chat transcript or raw model output does not meet the brief.
- Keep the API key on the server. Never use a `VITE_` variable for it, commit it, or expose it in responses or logs.
- All untrusted data needs runtime validation: request bodies, model output, API responses, and saved sessions.
- Malformed, wrong-shaped, empty, slow, failed, and stale responses must not crash the app or destroy the previous valid itinerary.
- Support mobile and accessible keyboard operation from the core implementation onward.
- Count planning, coding, tests, fixes, documentation, and recording toward eight hours of actual work. Stop at the limit and report unfinished work honestly.
- Ignore previous designs, mockups, and unrelated project material. Do not interpret "discard" as permission to delete files.
- No authentication, database, bookings, payments, maps API, live weather, destination photographs, or provider abstraction is needed for this submission.
- Choose compatible package versions when scaffolding, lock them, and record the model used. No dependency installation or version audit has been performed for this plan.

## Review focus

1. An older response arriving after a newer request, cancellation, or session load must never replace current state; test this in Task 4.
2. A model result with duplicate stop IDs, missing fields, invalid duration values, or oversized arrays must be rejected before rendering; test this in Task 2.
3. A failed refinement must leave manual removals, ordering, and the previous itinerary intact; test this in Task 6.
4. Corrupted browser storage or a denied storage write must leave the app usable and explain the problem; test this in Task 5.
5. Removing the last stop and navigating all actions by keyboard on a narrow screen must remain usable; test this in Tasks 3 and 8.

## 1. Assignment analysis and coverage

The evaluation gives React/architecture 25%, AI/data handling 25%, failure handling 20%, UI/UX 15%, and communication 15%. Spend most effort on a small working flow, explicit validation, and predictable state. The model provider and TypeScript choice do not affect the score.

### Mandatory coverage

| Assignment requirement | Planned behavior | Proof / owner |
| --- | --- | --- |
| React hooks and functional components | Small components; one planner hook manages requests and itinerary state | Tasks 1, 3, 4; explain the hook in the walkthrough |
| Free-form input | Labelled multiline trip brief with a sample prompt | Task 3; submit a natural-language trip request |
| Real LLM API | Backend calls Gemini using a server environment key | Task 2; one live successful request |
| Structured, stateful UI | JSON becomes day sections, stop cards, and optional typed blocks | Tasks 2, 3, 7; no raw AI text rendered |
| Expand stops | Expand/collapse description, location, and estimated activity duration | Task 3; keyboard and pointer check |
| Remove stops | Remove locally by ID; show a useful empty-day state | Task 3; remove the final stop without crashing |
| Reorder stops | Move up/down within a day; preserve stable IDs and expanded state | Task 3; first/last controls disable correctly |
| Malformed JSON and wrong shape | Reject at the server boundary, return a safe error, preserve the last result | Task 2; deterministic fixtures |
| Empty, slow, failed output | Explicit empty response error, cancel/timeout controls, retryable error state | Tasks 2, 4 |
| Stale response protection | Abort the previous client request and reject results whose request ID is obsolete | Task 4; controlled out-of-order responses |
| Loading, error, empty states | Separate initial, pending, successful, failed, and empty-day states | Tasks 3, 4 |
| Mobile | Single column on narrow screens; wrapped controls and no horizontal scrolling | Task 8; 390px viewport and manual 320px check |
| Safe API key | Server-only `.env`, ignored by Git; browser calls `/api/itinerary` | Tasks 1, 2, 9; inspect client build and network |
| README | Setup, usage, AI-usage note, limitations, actual time, and next steps | Task 9 |
| Original work and understanding | Build from this plan, use meaningful commits, explain all SDK and validation behavior | Each task; Task 9 walkthrough |
| Submission | Accessible GitHub repo, short recording, and working local start instructions | Task 9; publication is a later user action |
| Interview readiness | Demo, state/data walkthrough, a race-condition explanation, and a small extension exercise | Task 9 |

Deployment is preferred but optional. Prepare one production start path so deployment can be added if time remains; do not sacrifice core validation or the recording to deploy.

### Optional goals: recommendation and tradeoff

| Stretch goal | Decision for this plan | Smallest useful version |
| --- | --- | --- |
| Save/reload sessions | First optional priority | Explicit Save and Load; up to five locally stored trip sessions including edits |
| Refinement loop | Second optional priority | One instruction field, such as "make day two less busy"; submit the current edited itinerary |
| Different block types | Third optional priority | A useful travel tip card, packing checklist, and activity-time chart; no chart library |
| Polish | Include basic keyboard support in core; budget a short final polish pass | Clear focus states, small transitions, reduced-motion support, and a dark theme using CSS variables |
| Streaming | Defer by default | A separately scoped validated-progress implementation; see Section 7 |

The first three optional features and a small polish pass have budget slots. They are targets, not guarantees: if the core slips, remove optional work in reverse priority. Keyboard accessibility remains mandatory. All five stretch ideas are covered here, but the recommended submission does not claim streaming.

## 2. Project specification

### Product flow

1. Enter a brief: "Three days in Jaipur, two adults, relaxed pace, interested in food and architecture."
2. Select **Generate itinerary**. Show progress and Cancel while keeping any previous itinerary visible.
3. Replace the current itinerary only after the complete response passes validation.
4. Display a short trip title and assumptions above day sections. Each stop shows its name and estimated activity duration.
5. Expand a stop for details, remove it, or move it up/down within its day. These actions are immediate local edits.
6. Optional: save the edited trip, load a saved session, check packing items, or submit one refinement instruction.

Use one planner screen. On desktop, place the compact brief form beside the itinerary; on mobile, stack them. The input stays available after generation. Avoid a marketing landing page, chat bubbles, or a multi-step wizard.

### Approaches considered

- **Vite + small Express backend: recommended.** Easy to explain, one API route, no routing framework, and a single production origin. Two development processes require one combined start script.
- **Next.js + route handler:** viable if the builder already knows it; integrated deployment, but adds framework concepts this one-screen app does not need.
- **Browser calling a provider directly:** rejected because it exposes the API key and violates the assignment.

Gemini is a recommendation because it offers an accessible starting point; account eligibility, quota, and available models must be checked during setup. Use `GEMINI_MODEL` so the documented model can be selected without changing source. Do not build multiple provider adapters.

### Data contract

Define the runtime schemas and inferred TypeScript types together in `shared/itinerary.ts`. This is the shared boundary contract, not a generic schema framework.

| Entity | Fields and bounds |
| --- | --- |
| `Stop` | `id`: nonempty string up to 80 characters; `title`: 1-120; `description`: 1-800; `location`: 1-200; `durationMinutes`: integer 1-720 |
| `Day` | `dayNumber`: consecutive integers starting at 1; `title`: 1-120; `stops`: 1-8 stops in model output |
| `Itinerary` | `title`: 1-160; `assumptions`: 0-5 strings up to 240 characters; `days`: 1-7 days; `blocks`: 0-3 typed blocks |
| Tip block | `{ type: "card", id, title, text }`; title up to 120 and text up to 500 |
| Checklist block | `{ type: "checklist", id, title, items }`; 1-12 `{ id, label }` items, label up to 160 |
| Chart block | `{ type: "chart", id, title, metric: "activityMinutes" }`; values derive from the current itinerary's durations |
| Request | `{ mode: "generate", prompt }` or `{ mode: "refine", instruction, itinerary }` |
| API response | `{ itinerary }` on success; `{ error: { code, message } }` on failure |
| Saved session | `{ version: 1, id, savedAt, prompt, itinerary, checkedItemIds }`; store at most five |

Require globally unique stop IDs, unique block IDs, and unique checklist item IDs within the checklist collection. Reject unknown block types and invalid values. Do not coerce arbitrary objects into valid data. Model-provided IDs are opaque identity tokens; validate them instead of trusting their uniqueness.

**Generated versus edited data:** The model must produce at least one stop per day. A user may remove every stop from a day. Provide an editable schema allowing 0-8 stops and use it for current UI state, refinement input, and saved sessions. Use the generated schema for initial model output; use the editable schema for refinement output so intentional empty days can remain empty. Keep the shared base definitions and vary only that minimum. This prevents save/refine validation from undoing valid user edits.

For the basic version, support trips of up to seven days and make that limit visible beside the input. Instruct the model to refuse unsupported requests rather than silently truncate them; refusal or non-itinerary output goes through the safe failure path asking the user to revise the brief. If duration is absent, propose three days and disclose that assumption. Schema checks do not prove the model followed every travel preference.

A chart block is AI-selected structured presentation, but its bars come from current stop durations. This avoids inconsistent model-generated totals and updates after removals. Label it **Planned activity time**, not travel time or a verified schedule. Provide text totals alongside bars. No money arithmetic is required.

### AI and backend contract

- One route: `POST /api/itinerary`; JSON request body cap 512 KiB (524,288 bytes); trimmed prompt/instruction length 1-2,000 characters. This accommodates refinement snapshots at the permitted field bounds, including JSON escaping and Unicode; test that relationship instead of choosing an unrelated body limit.
- Validate mode, text, and any refinement itinerary before calling the provider. Reject an invalid request with 400.
- Use the SDK's `generateContent`, JSON response MIME type, and a response JSON schema. Explain in the README that the SDK sends the request; local parsing and runtime validation remain necessary for missing, truncated, refused, or semantically invalid results.
- Tell the model to produce practical stop cards, preserve supplied IDs on refinement, assign unique IDs to new stops, keep existing manual removals, change only what the refinement asks for, and disclose assumptions.
- Treat text fields as text. Render through React escaping; do not use `dangerouslySetInnerHTML`, model-generated executable code, or arbitrary model-provided links.
- Parse once with `JSON.parse`, then validate. Do not attempt regex repair of malformed JSON or silently keep only the valid days.
- Use a 30-second server timeout. Cancel the SDK request on timeout or client disconnect. The SDK's abort is client-side cancellation and does not guarantee the provider stops generation or charging.
- Limit output tokens to a reasonable cap configured in the provider call; truncated output is a handled error. Do not automatically retry model calls, so costs and behavior stay visible.
- Return 502 for unusable model output, 504 for timeout, 429 for rate limits, and 503 for missing server configuration/provider availability. Return generic 500 for unexpected server errors. Expose short actionable messages; do not echo provider bodies, stack traces, prompts, or keys.
- The browser has a 35-second timeout, validates successful response envelopes, and handles non-JSON error responses from proxies gracefully.

### State and local edits

Use `usePlanner` for `{ itinerary, status, error }`, a current request counter/ref, and an AbortController. Keep expanded stop IDs and checked item IDs as UI state outside the model contract.

Starting a request aborts the previous controller and increments the counter. Every success, failure, and final cleanup checks that it still belongs to the current counter. Cancel, loading a session, and unmounting invalidate the request. Aborting alone is insufficient because a response may already have completed.

Keep a failed request snapshot only while its result context remains unchanged. Removing/reordering a stop, loading another session, cancelling, or starting another request clears the old error and retry snapshot. Retry is then unavailable until a new failure. Expansion and checkbox toggles do not change the submitted itinerary. This prevents an old refinement retry from restoring subsequently removed stops or overwriting a loaded trip.

Keep the previous valid itinerary during generation or refinement. Disable stop mutations while a request is pending, but retain Cancel; this prevents AI completion from overwriting edits made during that request. Loading a session first cancels the request. If a user submits a replacement brief, the latest request wins.

Use pure local operations `removeStop(itinerary, stopId)` and `moveStop(itinerary, stopId, direction: -1 | 1)`. Move only within the existing day. Do not mutate arrays in place, use indexes as React keys, or add drag-and-drop before the core is done.

Successful refinement replaces the itinerary atomically. Preserve expanded/checklist state only for IDs still present; failed refinement changes neither data nor UI completion state. Full validated replacement is simpler than inventing an AI JSON Patch protocol. Scope preservation is best-effort model behavior and needs a limitation note.

### Failure behavior

| Condition | User-facing behavior |
| --- | --- |
| Blank brief | Inline "Describe the trip you want to plan"; no API call |
| Initial state | A concise sample brief and explanation of what the tool produces |
| Pending | Status announcement, Cancel, and previous result retained |
| Empty provider response | "The model returned no itinerary. Try again or revise your brief." |
| Invalid JSON/shape/IDs | "The model returned an itinerary we couldn't use. Please retry." |
| Timeout | "This is taking too long. Try again." with Retry |
| Offline/provider failure | Actionable error; Retry reuses the failed request snapshot only while its itinerary/session context is unchanged |
| Rate limit | Explain the limit and ask the user to retry later; no automatic retry loop |
| Cancel | Return to the previous result or initial state without a failure alert |
| Older completion | Ignore success, error, and cleanup; do not clear the newer loading state |
| Empty edited day | "No stops left for this day"; keep the day visible |
| Storage failure | Save/load notice; current working trip remains available |

Show **AI-generated suggestions. Verify opening hours, travel times, and availability before booking.** Avoid implying that schema-valid output is factually verified.

## 3. File map

Proposed files describe a fresh small implementation; they are not claims about existing files. Before implementation, inspect only relevant package/config files and retained application code, without reviving unrelated designs.

```text
src/
  App.tsx                    planner layout and form
  components/Itinerary.tsx   day sections and stop actions
  components/StopCard.tsx    accessible expansion and buttons
  components/ResultBlocks.tsx typed card/checklist/chart renderers
  hooks/usePlanner.ts        request lifecycle and immutable edits
  lib/api.ts                 fetch, timeout, response envelope validation
  lib/storage.ts             bounded, validated local session storage
  styles.css                 responsive layout, themes, focus, motion
shared/
  itinerary.ts               generated/edited/request schemas and types
server/
  index.ts                   API route, production static serving, startup
  generateItinerary.ts       provider call and output validation
tests/
  fixtures/itineraries.ts    valid and invalid deterministic responses
  itinerary.test.ts          schema and edit behavior
  generateItinerary.test.ts  provider-boundary failures
  usePlanner.test.tsx        races, cancellation, and preservation
  storage.test.ts            storage trust boundary
  planner.spec.ts            user flow and mobile browser checks
```

Configuration belongs in `package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, TypeScript configuration, `.gitignore`, and `.env.example`. Add only what the chosen template and runners need. No Redux, router, service/repository layers, or large component kit.

## 4. Eight-hour schedule

These are estimates, not a promise. Use a running time ledger. The 40-minute opening allocation includes analysis and planning already spent on this project.

| Task | Budget | Cumulative |
| --- | --- | --- |
| 1. Finalize contract, scaffold, start scripts | 40 min | 0:40 |
| 2. Live AI boundary and validation | 75 min | 1:55 |
| 3. Planner UI and stop interactions | 90 min | 3:25 |
| 4. Request failure/race handling | 60 min | 4:25 |
| 5. Save/reload | 25 min | 4:50 |
| 6. Refinement | 40 min | 5:30 |
| 7. Typed extra blocks | 30 min | 6:00 |
| 8. Mobile and polish pass | 30 min | 6:30 |
| 9. Final checks, README, recording | 60 min | 7:30 |
| Contingency for fixes | 30 min | 8:00 |

**Cut rule:** At approximately 4:25, the mandatory generation/edit/error flow should work. If it does not, spend optional slots fixing it. Reserve the final 60 minutes plus contingency for verification and submission. Cut chart blocks first, then dark mode/animation, then refinement; save/reload is the cheapest useful optional goal. Never cut safe keys, runtime validation, stale protection, mobile usability, README, or the recording. Do not add streaming merely because one task finishes early.

## 5. Implementation tasks

### Task 1: Contract and runnable project

**Files:** package/config files, `.env.example`, `.gitignore`, `shared/itinerary.ts`, initial `src/App.tsx`, and `server/index.ts`.

**Interfaces produced:** `GeneratedItinerarySchema`, `EditableItinerarySchema`, `PlannerRequestSchema`, and inferred `Itinerary`; development proxy `/api` to the backend; a production build/start path.

- [ ] Record actual planning time and start the work ledger.
- [ ] Scaffold React/TypeScript with pnpm from an explicit chosen repository directory. If existing code is retained, preserve its lockfile and compatible framework versions.
- [ ] Install only React/Vite, Express, the provider SDK, Zod, and local test/build tools required here. Use a small combined runner only if necessary for portable startup.
- [ ] Write the shared field bounds and generated-versus-edited schemas from Section 2; reject duplicate IDs and nonconsecutive day numbers.
- [ ] Add scripts: `start`/`dev` launch both development processes; `build` compiles client and server; `serve` runs the compiled API and serves `dist/client`; `typecheck`, `test`, and `test:e2e` run local checks.
- [ ] Configure `.env.example` with empty `GEMINI_API_KEY`, a documented `GEMINI_MODEL`, and the server port. Ignore `.env` and local env overrides.
- [ ] Run `pnpm start`: the page opens and `/api` reaches the backend; no provider call is needed yet.
- [ ] Commit the runnable skeleton and shared contract with a focused message.

**Done:** a fresh clone can start through one documented pnpm command after configuring the key; the client has no secret dependency.

### Task 2: Safe real-model generation

**Files:** `server/generateItinerary.ts`, `server/index.ts`, shared schemas, fixtures, and `tests/generateItinerary.test.ts` / `tests/itinerary.test.ts`.

**Interfaces:** `generateItinerary(request: PlannerRequest, signal: AbortSignal): Promise<Itinerary>`; the route emits the success/error envelopes in Section 2. Keep parsing as a small pure function so invalid fixtures do not need an API key.

- [ ] Before implementation, write fixtures/assertions for valid output, malformed JSON, null/empty text, missing stops, negative duration, duplicate IDs, nonconsecutive days, unknown blocks, and oversized arrays.
- [ ] Verify those tests fail for the intended missing validation behavior, then implement the shared validation and provider parsing.
- [ ] Add the SDK call, model/schema configuration, prompt instructions, 30-second timeout, and disconnect cancellation.
- [ ] Validate request bodies before provider invocation. Test that a blank instruction or invalid refinement snapshot results in zero provider calls; oversized bodies return a safe 413. Build maximum-bound refinement fixtures using escaped text and Unicode and assert their serialized UTF-8 sizes fit 524,288 bytes.
- [ ] Translate provider failures into safe status/message pairs; test timeout, rate limit, and non-JSON provider failure without relying on live failures.
- [ ] Run the focused tests, then make one real request and inspect the parsed itinerary.
- [ ] Inspect browser/network output for accidental key exposure; commit the provider boundary.

**Done:** valid live output reaches the client; all invalid fixtures produce safe errors rather than partial accepted itineraries.

### Task 3: Interactive itinerary

**Files:** `src/App.tsx`, `components/Itinerary.tsx`, `components/StopCard.tsx`, `hooks/usePlanner.ts`, `styles.css`, and `tests/itinerary.test.ts`.

**Interfaces:** `removeStop(itinerary: Itinerary, stopId: string): Itinerary`; `moveStop(itinerary: Itinerary, stopId: string, direction: -1 | 1): Itinerary`. Components receive the itinerary and action callbacks; they do not call Gemini.

- [ ] Write edit tests: removal affects only the requested ID; moving the middle stop changes order without mutating the original; moving past a boundary is a no-op; removing the last stop leaves an empty day.
- [ ] Implement the pure operations and prove those tests pass.
- [ ] Build the labelled brief form, Generate action, initial empty state, title/assumptions, days, and stop cards using a valid fixture first.
- [ ] Use native buttons and either native disclosure or a button with `aria-expanded` / `aria-controls`. Give each move/remove button a stop-specific accessible name.
- [ ] Keep expansion keyed by stop ID. After removal, move focus to the next available stop action or the day heading.
- [ ] Connect the form to the real API path; check expansion, removal, and within-day reordering with a real generated result.
- [ ] Commit the working trip-planning core.

**Done:** a user can generate, inspect, and edit a trip; the UI is already keyboard operable and can display an empty edited day.

### Task 4: Reliable request lifecycle

**Files:** `src/lib/api.ts`, `hooks/usePlanner.ts`, `src/App.tsx`, and `tests/usePlanner.test.tsx`.

**Interfaces:** `requestItinerary(request: PlannerRequest, signal: AbortSignal): Promise<Itinerary>`; hook actions `generate(prompt)`, `cancel()`, and later `loadSession(session)` / `refine(instruction)` share the lifecycle logic.

- [ ] Use controlled promises to test: B finishes before A; A fails after B starts; Cancel occurs just before A resolves; an obsolete `finally` must not clear B's loading state.
- [ ] Test that malformed successful API envelopes and non-JSON proxy errors produce safe errors and preserve the previous itinerary.
- [ ] Implement abort plus request-counter checks around success, catch, and cleanup. Invalidate on cancellation and unmount.
- [ ] Add client timeout, status announcements, Cancel, and Retry. Retry uses the failed request snapshot, not a newly changed text field. Removing/reordering stops, loading a session, cancelling, or starting a new request clears obsolete errors and retry snapshots.
- [ ] Disable stop editing while pending; allow session load to cancel and invalidate pending work. Keep the last result visible on failures.
- [ ] Run hook tests and manually check blank input, timeout, error, retry, and replacement submission.
- [ ] Commit when every mandatory failure mode has a deterministic check.

**Done:** passing controlled race tests, no blank-screen failures, and no stale data overwrite. This is the core quality gate before optional work.

### Task 5: Save and reload sessions

**Files:** `src/lib/storage.ts`, `src/App.tsx`, planner hook load action, and `tests/storage.test.ts`.

**Interfaces:** `readSessions(): SavedSession[]`; `saveSession(session: SavedSession): SavedSession[]`, with caught errors surfaced to the UI. Use one versioned localStorage key, `trip-planner:sessions:v1`.

- [ ] Test round-trip preservation of reordered stops, empty edited days, and checked checklist IDs. Test corrupted JSON, invalid schema/version, and storage write failure.
- [ ] Store up to five sessions. Saving a loaded session updates its ID; saving a new trip creates an ID and keeps the five most recently saved. Explain the limit beside saved trips.
- [ ] Add Save and a compact labelled Load selector; report success/failure without clearing the working itinerary.
- [ ] Loading cancels pending requests, validates the session, and restores the saved prompt and local edits.
- [ ] Reload the browser and load a saved trip; commit.

**Done:** local sessions survive reload, and bad storage cannot crash the planner. There is no account or cloud sync.

### Task 6: Refinement without losing the current result

**Files:** `src/App.tsx`, `hooks/usePlanner.ts`, provider prompt in `server/generateItinerary.ts`, and `tests/usePlanner.test.tsx`.

**Interfaces:** `refine(instruction: string): Promise<void>` sends `{ mode: "refine", instruction, itinerary: currentEditedItinerary }` through the same API and request protection.

- [ ] Test that the submitted snapshot reflects a removed/reordered stop, not the original generated itinerary.
- [ ] Test that invalid or failed refinement leaves itinerary, expanded IDs, and checked state unchanged. Then remove a stop or load another session and assert the old refinement can no longer be retried.
- [ ] Test that a valid refinement retains UI state for surviving IDs and drops state only for deleted IDs.
- [ ] Add one labelled refinement field and Apply changes action below the summary; do not create a chat history.
- [ ] Prompt the model to preserve unchanged IDs and existing manual removals. Validate using the editable schema and commit the whole replacement only on success.
- [ ] Try "make day two less busy" on an edited real itinerary and inspect the difference; commit.

**Done:** follow-up text edits the current plan through structured data, and failures are nondestructive. Explain that the model can still make broader changes than requested.

### Task 7: Distinct useful output blocks

**Files:** `src/components/ResultBlocks.tsx`, shared block definitions, provider instructions, `tests/itinerary.test.ts`, and browser flow test.

**Interfaces:** `ResultBlocks({ blocks, itinerary, checkedItemIds, onToggleItem })`; chart totals are derived from `itinerary.days`.

- [ ] Have the model return a small tip card, packing checklist, and activity-time chart block when useful, within the existing three-block bound.
- [ ] Render each discriminator explicitly: text card, labelled checkboxes, or CSS bars plus numeric text. Never print unknown block JSON into the UI.
- [ ] Test unknown-type rejection, independent checkbox changes, and chart totals updating after stop removal.
- [ ] Save checklist state outside the model contract; preserve it by item ID across supported edits.
- [ ] Check the blocks with a live result and commit. If behind schedule, drop the chart before extending the budget.

**Done:** multiple AI-selected structured block types produce appropriately interactive UI; no visualization dependency is added.

### Task 8: Mobile, accessibility, and bounded polish

**Files:** `src/styles.css`, relevant component markup, and `tests/planner.spec.ts`.

- [ ] Test the core flow at 390px in installed Chrome using Playwright Test with `channel: 'chrome'`; check 320px manually.
- [ ] Tab through form, generation/cancel/retry, stop expansion/removal/reordering, save/load, and optional checklist/refinement. Check visible focus and a useful focus target after removal.
- [ ] Fix wrapped labels, overflowing text, target sizes of approximately 44px, and low contrast. Announce request status with a polite live region and errors with an alert.
- [ ] If the time gate allows, add light/dark CSS variables, respect the system theme, and offer a labelled toggle. Add short transitions and disable nonessential motion under `prefers-reduced-motion`.
- [ ] Verify both themes; close task-owned browser sessions; commit.

**Done:** the app works on mobile and by keyboard. Decorative motion and dark mode are expendable; accessibility is not.

### Task 9: Verification and submission preparation

**Files:** `README.md`, `.env.example`, package scripts if fixes are needed, and the screen recording artifact.

- [ ] Run from the explicit repo directory: `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm exec playwright test`. Expected: all checks exit successfully; no real provider calls in automated tests.
- [ ] Start the built app using `pnpm serve`; prove that the client and API work on the same origin. Then check the documented development `pnpm start` path.
- [ ] Make one final live request, edit it, and use the optional features actually completed. Inspect browser console, API errors, and the built client for secret exposure.
- [ ] Write exact setup commands: `pnpm install`, copy/configure `.env`, `pnpm start`; include build/serve and test commands. Keep an ordinary `start` script because the assignment expects a simple install/start experience; document pnpm as directed by the user.
- [ ] Include README sections for usage, architecture, model configuration, AI-usage disclosure, known limitations, actual time ledger, finished/deferred optional goals, and next steps.
- [ ] Record roughly 2-3 minutes showing generation, expand/remove/reorder, an error/retry demonstration, mobile layout, and whichever optional goals shipped. Clearly identify simulated failures; the successful generation must use the real model.
- [ ] Review meaningful commits and prepare repository access instructions. Do not publish the repository or recording as part of this planning task.
- [ ] Rehearse explaining runtime validation versus TypeScript, why abort alone is insufficient, why the key lives on the server, and why streaming was deferred. Practice adding a small local "restore removed stop" feature as an interview exercise only if time remains.

**Done:** the submitted behavior, README, recording, and reported time agree. Stop at eight hours even if optional work is incomplete.

## 6. Minimal verification matrix

| Check type | Required cases |
| --- | --- |
| Pure validation | Valid itinerary; malformed JSON; empty/null; missing fields; wrong types; duplicate IDs; invalid durations; excessive bounds; unknown blocks; generated versus edited empty days |
| Provider route | Invalid request without a model call; maximum-bound refinement fits body limit; safe oversized-body rejection; missing configuration; timeout; refusal/unusable response; rate limit; safe unexpected failure |
| State tests | Out-of-order success; obsolete failure/finally; cancel; old result preserved; failed refinement; edits/session load invalidate old retry; session load invalidates pending work |
| Browser test | Generate via deterministic API fixture; expand/remove/reorder; empty day; error then retry; save/reload; refinement; keyboard and mobile viewport |
| Manual live checks | At least one real generation and one refinement if shipped; inspect factual caveats and provider configuration |
| Delivery check | Fresh install/start instructions; production build/serve; no key in Git/client; honest time and AI notes; viewable recording |

Tests mock the provider or API boundary, not core UI operations. Keep fixtures small and readable. Use repository-local runner versions compatible with the selected React/Vite setup; global tools do not replace the lockfile.

## 7. Streaming: covered, deliberately deferred

Streaming is the highest-risk optional goal because transport chunks are not complete validated itineraries. A spinner, character counter, or typewriter animation after a full response is not streaming the structured result.

If the mandatory submission and higher-priority extras finish with substantial time left, first estimate this separately; do not force it into the eight-hour budget. A later implementation should:

1. Use the SDK's streaming generation on the server and forward typed progress events through a fetch-readable stream or SSE.
2. Use a proven incremental JSON parser to identify completed day objects. Validate each completed day before showing a read-only preview. Never `JSON.parse` arbitrary network chunks or enable editing incomplete data.
3. Buffer transport framing safely across chunk boundaries; reject malformed, oversized, truncated, or unknown events.
4. Keep the last committed itinerary separate from the preview. Commit only after full final validation, including global ID uniqueness and day order.
5. Apply the same request-ID, timeout, cancel, and disconnect protections to every event and final commit.
6. On failure, discard only the preview and keep the last valid itinerary. Do not persist or refine a partial result.
7. Test split JSON tokens, multiple events in one chunk, duplicate/out-of-order days, midstream failure, abort, stale streams, and an invalid final result.

This requires additional parsing and lifecycle complexity, so it is not recommended for the first submission. List it as deferred in the README rather than claiming partial implementation.

## 8. Final acceptance checklist

- [ ] Real trip description produces a validated day-by-day itinerary.
- [ ] Every stop can expand, be removed, and move within its day.
- [ ] Empty edited days render safely and can be saved/refined if those features ship.
- [ ] Bad JSON, wrong shape, empty, slow, failed, and stale responses are handled explicitly.
- [ ] The last valid result survives failed generation or refinement.
- [ ] API keys remain server-side and outside Git/client builds.
- [ ] Mobile and keyboard flows work.
- [ ] Recommended optional goals completed within the budget are listed accurately; unfinished ones are marked deferred.
- [ ] README setup/usage, AI note, limitations, time spent, repo access, and recording are ready.
- [ ] Actual work stops at eight hours; the final report explains what would be done next.

## 9. Planning status and limitations

This plan was checked against all four assignment pages. Stack, field bounds, component boundaries, and optional ordering are recommendations made for this plan, not constraints imposed by the assignment. No previous mockups or application designs informed it.

Implementation has not started. Provider access/quota, exact locked package versions, runtime tests, deployment, and recording remain execution work. The eight-hour estimates are tight, especially if the builder is new to these tools. Structured validation improves reliability of the interface; it cannot verify real opening hours, routing feasibility, or the truth of AI travel suggestions.

Provider reference consulted for planning: [Google Gen AI JavaScript SDK](https://github.com/googleapis/js-genai). Confirm version-specific options against the package installed during implementation.
