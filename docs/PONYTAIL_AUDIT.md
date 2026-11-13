# Ponytail repository audit — 14 November 2026

What this repo does: Wanderlux turns a trip brief into a validated, editable itinerary using Azure Responses. It saves five trips locally and optionally shows resolved places on a Leaflet map. The assumed load is one person running the loopback-bound app locally, not a public multi-user service.

Audit snapshot: commit `2e235ad`. The source review made no application changes; the user's already-authorized fixes and cleanup are recorded below after verification.

## Must fix

1. **Chart copy contradicts its totals** (`src/components/ResultBlocks.tsx:74`).
   - **What this is:** The chart sums the duration of every stop, including lunch and rest stops.
   - **Problem:** Its caption says breaks are excluded. For the fixture's 60-minute lunch, the total includes that time while the explanation claims otherwise.
   - **Fix:** Describe the values as time for all planned stops, excluding travel between them. Keep the schema and arithmetic unchanged.
   - **If we skip it:** People can mistake a stop-time total for sightseeing time alone.

## Should fix

2. **Browser failures lose debugging context** (`src/lib/api.ts`, `src/lib/locations.ts`, `src/lib/storage.ts`).
   - **What this is:** These functions turn network, parsing and storage failures into useful short messages.
   - **Problem:** They drop the original exception. A browser storage SecurityError, invalid JSON SyntaxError, and invalid-field ZodError cannot be inspected later through the returned Error. HTTP errors also lose their safe status/code.
   - **Fix:** Use the standard Error `cause` option. Preserve safe screen messages; keep raw failures out of rendered UI and logs. Keep HTTP status/public code as debugger metadata.
   - **If we skip it:** Debugging requires reproducing the failure with breakpoints at the original throw site.

3. **The reset action lacks a data-safety regression** (`src/App.tsx:91`, `tests/App.test.tsx`).
   - **What this is:** Reset asks for confirmation and deletes this app's saved-session key.
   - **Problem:** No test checks that cancelling keeps saved data or confirming preserves the current trip and unrelated browser storage. A future change to this destructive branch could go unnoticed.
   - **Fix:** One screen regression should check cancellation, confirmation, working-trip preservation and unrelated storage.
   - **If we skip it:** An accidentally widened deletion or inverted confirmation can destroy browser data without a regression failure.

4. **Discarded assets consume space without serving the app** (`output/mockups/`, `output/screenshots/`, `PRODUCT.md`).
   - **What this is:** These are earlier discarded designs, their render script and old verification captures. The mockups alone occupy roughly 29 MiB.
   - **Problem:** No application/test/config path uses them. Searches found no live screenshot links; previous exclusion notes are historical records.
   - **Fix:** Delete these files under the user's cleanup authorization. Keep the linked demo recording, favicon, source, tests and current learning docs. Delete generated test/build artifacts after verification; let pnpm prune only extraneous installed packages.
   - **If we skip it:** The workspace retains large irrelevant images/GIFs and confusing older designs.

## Nice to have

5. **The same duration rule appears in three views** (`TripSummary.tsx`, `Itinerary.tsx`, `ResultBlocks.tsx`).
   - **What this is:** Each view separately sums stop.durationMinutes; the trip summary nests two reductions.
   - **Problem:** A future rule change must reach all three copies. The nested calculation is harder to read than the other two.
   - **Fix:** One pure `getTotalDurationMinutes(stops)` helper reused by all three views. Keep state and presentation in the existing components.
   - **If we skip it:** Future changes can make the summary, day totals and chart disagree.

## Healthy paths and scope

All application source modules, shared schemas, entry points, build/test configuration and repository tests were inspected. Generation/refinement validates both incoming requests and model output. Saved reads/writes validate the versioned contract and preserve corrupted data until explicit reset. Native React escaping, generated DOM IDs, safe serialized errors and sanitized server diagnostics protect private text/credentials. Abort controllers plus request identity checks preserve the latest trip; the map validates coordinates and handles missing places separately.

The async guards and separate generated/edited schemas are necessary complexity: deleting them would permit stale results or reject intentionally empty days. Map components, lookup hook and server boundary have distinct jobs. There is no reason to add a state library, generic provider framework, routing framework, logging package or class helper. Every declared dependency has a source, script, test, compiler or peer-dependency role. `pnpm audit` returned **no known vulnerabilities**.

Public deployment, global geocoding throughput, cloud storage and travel accuracy remain disclosed limits of a local app. A marked process-only cache is a scope decision, not a bug at this load. No smaller findings were omitted to manufacture a perfect score.

Verdict: The architecture is healthy. Correct the caption and preserve debugging context; add the reset regression and clear obsolete files.

Lean: The meaningful saving is obsolete assets, not deleting needed libraries. No declared dependency removal is justified.

Not checked: Every third-party implementation, future intentional bugs, public load, a clean-machine installation, and factual travel accuracy. Registry advisory checks cannot prove that dependencies have no undiscovered vulnerabilities.

## Authorized follow-up results

All five findings have been addressed:

- The chart caption now includes all planned stops and excludes travel between stops. One pure duration helper supplies summary, day and chart totals. The screen regression checks updated totals after removing lunch.
- Browser API/map/storage errors retain native causes without exposing private details in their screen messages. Validated server errors retain safe HTTP status/code metadata. Five new cause regressions failed against the old behavior, then passed with the fixes.
- A screen regression checks reset cancellation and confirmation. It protects saved data, unrelated storage and the working itinerary.
- Removed 15 discarded mockup files, four old screenshots and superseded PRODUCT.md: **31,347,214 bytes (29.9 MiB)**. After passing verification, removed 12 generated build files and one test-result file: **559,618 bytes**. Total removed file contents: **31,906,832 bytes (30.4 MiB)** across 33 files. These are logical sizes; retained Git history and pnpm hard links mean they are not a measurement of physical disk blocks freed.
- Default `pnpm prune` completed successfully and found the install already up to date. No dependency or lockfile change was justified. All **8 runtime / 19 development packages** have their purpose listed in README. The linked demo, favicon, source, tests, credentials, needed tooling and Git history were kept. Production files can be recreated with `pnpm build`.

Final checks after the code fixes: **90 unit/component/API tests passed**, **16 desktop/mobile Chrome tests passed**, and **typecheck plus client/server production build passed**. No new live paid provider call was needed for these browser-boundary changes; the provider integration and real map matches were verified in the preceding feature work. No new interactive visual inspection was performed for this follow-up; the existing reproducible browser tests ran through Playwright Test. Generated verification output was removed afterwards.

The walkthrough documents every application module, the shared helper, error causes, debugging steps and small extension paths. Decisions 33–36 record choices and alternatives. The initial plan is clearly marked historical, including its superseded provider, deadlines and time constraint.

Verdict after fixes: Healthy for the documented local use. No broad rewrite or extra framework is needed. A readable codebase cannot guarantee that every future bug is automatically detected; this report records concrete checks rather than claiming that guarantee.

## Final readability checkpoint — 15 November 2026

The final pass found three small places to make existing work easier to follow: collect unique map queries with loops, collect resolved plotted stops with loops, and let Zod's `parse` throw into the existing saved-data error boundary. The arrow SVG template is now split across readable lines. No new dependency, abstraction, state owner or saved-data format was introduced. Decision 39 and the walkthrough explain the changes.

The retained request counters, cancellation checks, generated/edited schema distinction, bounded lookup queue, caches and map import recovery each protect a concrete feature or failure case. Removing them would make the source shorter while allowing stale results, rejecting valid edits or losing the working screen after a download failure. They remain in the files that own those responsibilities.

Fresh checks passed: **90 unit/component/API tests**, **16 desktop/mobile Chrome tests**, typecheck, client/server production build, formatting and whitespace checks. The dependency audit reported **no known vulnerabilities**. No further dependency removal or architecture rewrite was justified. Live provider calls, public load, clean-machine installation and real-world place/travel accuracy were not rechecked.
