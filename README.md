# Wanderlux trip planner

A small React app that turns a free-form trip brief into an editable day-by-day itinerary. The server uses an Azure OpenAI / Foundry **GPT 6 Luna deployment through the Responses API**. It is a planning tool with structured components, not a chatbot.

## Run locally

Requirements: Node **26 or later** and pnpm. This project was checked with Node 26.13 and pnpm 12.18. The locked test tooling also requires a recent Node release; declaring Node 26 avoids promising compatibility with older runtimes we have not verified. Dependencies are locked in `pnpm-lock.yaml`.

```powershell
cd C:\Projects\wanderlux
pnpm install
Copy-Item .env.example .env
```

Edit `.env` locally:

```dotenv
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.services.ai.azure.com/openai/v1
AZURE_OPENAI_DEPLOYMENT=gpt-6-luna
AZURE_OPENAI_API_KEY=YOUR_KEY
PORT=3001
```

`AZURE_OPENAI_DEPLOYMENT` is your deployment name in Azure. It need not equal the underlying model's name. The endpoint must include `/openai/v1`. A key already supplied through the shell environment can stay there; Node environment values take precedence over the env file. Never put a key in chat, a `VITE_` variable, or Git.

If this workspace is already configured, keep its existing `.env`; do not overwrite it with the example.

```powershell
pnpm start
```

Open [the planner](http://127.0.0.1:5173). This command starts both Vite and the API. The API runs on port 3001; the development proxy expects that port, so leave `PORT=3001` for development.

On this machine, if the desktop app has not refreshed PATH, use `C:\Users\deymr\AppData\Local\pnpm\bin\pnpm.cmd` in place of `pnpm`.

### Production build

```powershell
pnpm build
pnpm serve
```

Open [the built planner](http://127.0.0.1:3001). Express serves the built client and API on the same origin. The server currently binds to loopback for local testing; deployment is intentionally deferred.

## Use the app

1. Describe a destination, interests, pace, and up to seven days.
2. Generate an itinerary. The previous plan remains visible while a request runs.
3. Expand stops, move them up/down within their day, or remove them. These are immediate local edits.
4. Enter a refinement such as “make day two less busy.” The AI receives the current edited itinerary.
5. Check packing items and save the trip. Up to five sessions can be reloaded in this browser; saving an existing session updates it.
6. Open **Show map** below the stops to see numbered teardrop pins, day colors and matched-place popups. Scroll over the map to zoom in/out; arrows show the visit direction. The map follows edits; colocated stops share a pin.

Generated results may include a travel tip, a packing checklist, and a chart of planned activity time. Chart values come from the current stops so removals update the totals. The theme toggle supports light/dark mode and motion respects the operating system's reduced-motion preference.

The map uses React Leaflet 5 / Leaflet 1.9.4, OpenStreetMap tiles, and [Photon place lookup](https://github.com/komoot/photon#demo-server). No additional API key is needed for the modest local demo. Lookups start only when opened, run one at a time at least 1.1 seconds apart, and cache up to 256 results on the server. A long itinerary can take longer to locate; pins appear progressively. `PHOTON_ENDPOINT` can override the default `https://photon.komoot.io/api/` search endpoint. The public demo permits reasonable usage but may throttle or become unavailable; use an appropriate hosted/private instance before scaling.

Location names should include the place, city and country. Pins are approximate matches; popups show the matched name so you can check it. Lines show visit order, not walking/driving routes. Missing places remain editable and savable. If a map-file download fails, the trip stays open; save it before reloading the page to retry. Required map/data attribution remains inside the map section.

## Learn the code

Start with [the walkthrough](docs/CODE_WALKTHROUGH.md), then [decisions and alternatives](docs/DECISIONS.md). Both explain why code exists and where to extend it. The [whole-repository Ponytail audit](docs/PONYTAIL_AUDIT.md) records concrete findings, fixes and limits.

The flow is:

```text
App form -> usePlanner -> internal /api/itinerary
          -> Express -> Azure Responses API
          -> Zod validation -> React components
```

`shared/itinerary.ts` is the boundary contract. `server/generateItinerary.ts` contains the provider call. `src/hooks/usePlanner.ts` handles request identity and edits. Components render validated data. `src/lib/storage.ts` validates local sessions.

The OpenAI SDK formats and sends the structured-output request, extracts/parses the response, and supports cancellation. Our runtime schemas still check field bounds, consecutive day numbers, and globally unique IDs. TypeScript alone cannot validate network or saved data.

`SavedTrips` and `TripSummary` keep those screen sections in focused files; `App` coordinates their callbacks. Server failures retain their original cause and produce sanitized terminal diagnostics, while browser errors remain short and safe. The walkthrough includes a step-by-step debugging procedure.

### Why these dependencies exist

All eight runtime and nineteen development dependencies have an active role. Development dependencies are needed to build, check or test the project; removing them would break those commands. No package was added for this audit.

| Packages                                                                              | Job                                                               |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `react`, `react-dom`                                                                  | Components, state and browser rendering                           |
| `express`                                                                             | Local API routes and production static files                      |
| `openai`                                                                              | Official Azure Responses client and structured-output parsing     |
| `zod`                                                                                 | Validate requests, results, saved trips and map coordinates       |
| `leaflet`, `react-leaflet`                                                            | Map controls and React integration                                |
| `lucide-react`                                                                        | Shared button icons                                               |
| `vite`, `@vitejs/plugin-react`                                                        | Development server, JSX support and client build                  |
| `tailwindcss`, `@tailwindcss/vite`                                                    | Styling and its Vite integration                                  |
| `typescript`, `tsx`                                                                   | Type checking/server compilation and direct development execution |
| `concurrently`                                                                        | Start API and client together                                     |
| `vitest`, `jsdom`, `@testing-library/react`                                           | Logic and React tests in a browser-like environment               |
| `supertest`, `@types/supertest`                                                       | HTTP route tests and their TypeScript definitions                 |
| `@playwright/test`                                                                    | Reproducible desktop/mobile Chrome tests                          |
| `prettier`                                                                            | Consistent code formatting                                        |
| `@types/node`, `@types/express`, `@types/react`, `@types/react-dom`, `@types/leaflet` | Types for the corresponding runtimes/libraries                    |

Native `fetch`, `URLSearchParams`, `AbortController`, `Map`, `Set` and `Error.cause` cover the remaining needs. A second HTTP client, state manager or logging package would add concepts without simplifying a current task.

## Reliability and tests

```powershell
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Browser tests use installed Chrome through Playwright Test, with desktop and 390px mobile viewports. Install Chrome if it is absent; this project does not download an additional browser by default. Tests replace the provider/API boundary with deterministic fixtures; the working app always calls Azure.

The tests cover malformed/wrong-shaped/empty output, duplicate IDs, edited empty days, invalid requests, rate limits, corrupted/denied storage, API errors, out-of-order promises, cancellation, obsolete retries, save/reload, refinements, keyboard entry, and mobile overflow. Live smoke tests are separate and consume provider quota.

Focused regressions also cover SDK connection-error classification, complete endpoint validation, safe diagnostic logging, and provider cancellation after a real local HTTP disconnect. The disconnect test was checked against a deliberately reversed condition and detected the bug; normal-completion cancellation is checked separately.

Audit regressions retain original browser error causes behind safe messages and verify that cancelling saved-trip reset preserves data. Confirming reset removes only this app's key and preserves the working trip and unrelated browser storage. Summary, day and chart totals share one duration helper.

Map tests cover GeoJSON coordinate order/ranges, cached misses, serialized lookups, cancellation/stale results, retry, development-mode effect checks, grouped pins, editing, long scrollable popups at 320px, and failed map-file downloads. Browser tests mock map lookup/tile responses so they do not consume public-service capacity; live map checks are separate.

Automatic provider retries are disabled. The server/provider deadline is 120 seconds and the client deadline is 130 seconds. Both values come from `shared/requestLimits.ts`; the extra ten seconds let the server return a clear error before the browser gives up. A live seven-day generation took 31.3 seconds, exceeding the original 30-second cutoff. Abort is best effort and cannot guarantee cancellation of provider processing or charges. A request counter also prevents stale results and errors from overwriting newer work.

Styling uses **Tailwind CSS v4** through its official Vite plugin. Layout and typography utilities live in the JSX. `src/styles.css` holds theme variables, shared focus behavior, and repeated controls using Tailwind's `@apply`. See the walkthrough for utility syntax and theme changes.

## AI-usage note

Codex helped analyze the supplied assignment, propose this plan, research the official library APIs, write implementation/tests/documentation, and inspect the app in Chrome. The user selected Azure GPT 6 Luna for live testing. The code includes reasons for the important behavior and a walkthrough so the author can explain and extend it; this note is intended to be kept honest and updated before submission.

## Known limitations

- Trips are limited to seven days and eight stops per day. Longer/unsupported requests should be revised; output is not silently repaired.
- Suggestions are not verified against live opening hours, travel times, prices, accessibility, or availability. Confirm details before booking.
- Refinement returns a full validated replacement. The prompt asks the model to preserve unchanged IDs and edits, but it may change more than requested.
- Reordering is within a day. Drag-and-drop and moving stops between days are deferred.
- Saved sessions are local to this browser/origin. There is no account, cloud sync, or database. The five latest saves are retained.
- Streaming and deployment are deferred. There is no public-facing abuse-control layer; keep the server local until deployment requirements are addressed.
- The model provider may refuse a prompt, hit quota, or time out. Safe errors/retry preserve the previous valid plan.

## Assignment and submission

The mandatory trip-planning interactions and reliability requirements are implemented. Recommended extras included: saving, refinement, distinct blocks, and bounded polish. Streaming remains deferred because it needs a separate partial-response protocol and validation; lifting the working-time constraint does not add it to this readability/cleanup task.

Before submitting, share a public repo or grant private access, attach a short screen recording, and state your **actual** time spent. Do not submit someone else's repository or claim that all AI suggestions are verified.

Build progress and verification evidence are recorded in [the build log](docs/BUILD_LOG.md). The original assignment specifies eight hours; on 14 November 2026 the user lifted that constraint for this ongoing project work. Report actual time and this distinction honestly if submitting. Session time is not equivalent to the human author's independent work time.

**Observed assisted build time:** approximately 45 minutes between the first schema test at 19:08 and final build checks around 19:53 IST on 13 November 2026, plus initial setup and the earlier planning turn. This is an elapsed tooling interval including automated waits, not a manual timesheet.

The [short demo recording](output/trip-planner-demo.mp4) shows a live-generated trip and local editing/saving/theme controls. It has no narration and is trimmed to remove waiting. Live generation/refinement were verified separately; add your own explanation or record a longer walkthrough before an interview.

## Extending it

The walkthrough includes small, concrete extension paths: add a new stop field, add another typed block, implement restore/remove, or move stops across days. Update the shared schema, provider instructions, renderer, and meaningful tests together; do not add a second provider or state library unless it solves a demonstrated need.
