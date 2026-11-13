# Decisions and alternatives

This file records the choices made while building. The assignment and the user's later directions control scope. Previous mockups and PRODUCT.md were excluded.

## 1. A small app in this folder

**Choice:** Create a React application and a Git repository on `feat/trip-planner` here. **Reason:** There was no existing application, package manifest, lockfile, or repository to preserve. **Considered:** a separate worktree, which requires a repository and would add no isolation benefit at this point. Existing unrelated material stays untouched and ignored by Git.

## 2. Readable TypeScript

**Choice:** Explicit names, ordinary functions, small components, and explanatory comments about the reasons behind behavior. **Reason:** The user wants to understand, explain, and extend the code. **Considered:** JavaScript saves type annotations, but TypeScript documents the data passed between the API and components. Dense one-liners and speculative abstractions save little and make learning harder. Comments explain decisions, not every obvious assignment.

## 3. Vite, React, Express, and ordinary CSS

**Choice:** One screen, one API route, and a small CSS file. **Reason:** This covers the assignment without a router, state library, database, or design framework. **Considered:** Next.js integrates routes but introduces framework behavior this tool does not need; a component kit adds a second system to learn. Vite handles browser compilation, while Express handles HTTP parsing and errors on the server.

## 4. Azure GPT 6 Luna replaces Gemini

**Choice:** Use the user's Azure OpenAI / Foundry deployment. **Reason:** The user explicitly requested it for testing. **Considered:** Gemini from the plan, which is superseded by this instruction. Connection details and API keys stay server-side; the exact Azure endpoint and deployment name must be configured before a live test. No public API route can be inferred from Codex's own model names.

## 5. Runtime schemas as the shared data contract

**Choice:** Zod schemas define accepted data and provide TypeScript types. **Reason:** TypeScript disappears at runtime and cannot protect against malformed model output or corrupted storage. **Considered:** hand-written validation, which repeats many field checks, and trusting provider structured-output mode, which does not cover failures, missing text, or cross-field identity rules. Strict schemas reject unexpected fields. Generated days require stops; edited days can be empty so user deletions remain valid.

## 6. A restrained planner interface

**Choice:** A warm, readable workspace with a compact form, day sections, and native interactive controls. **Reason:** Users need to complete a planning task, not navigate a promotional site. **Considered:** a photo-heavy landing page, animated scenes, maps, and a chatbot; they add scope and distract from the required editable structured result. Design skills inform spacing, contrast, focus, motion, and mobile behavior; marketing-page recipes are outside this brief.

## 7. pnpm and local dependencies

**Choice:** Use pnpm scripts and a committed lockfile. **Reason:** This follows the user's tool routing and gives another developer repeatable versions. **Considered:** global test runners, which cannot replace the repository's actual compatible dependencies.

## 8. The official OpenAI SDK and its Zod helper

**Choice:** Use `openai.responses.parse` with `zodTextFormat`, following Microsoft's Azure v1 examples. **Reason:** The user asked us to research reusable libraries; this maintained SDK handles request formatting, authentication, cancellation, response text extraction, and JSON parsing. **Considered:** native server-side fetch, initially proposed because there is one endpoint; it would require hand-written Responses envelope handling and schema formatting. The SDK removes more code than it adds. We still validate cross-field rules locally and handle missing/incomplete/refused responses explicitly. We disable automatic retries to avoid surprise repeated requests. The browser uses ordinary fetch because it calls one small internal JSON API, not Azure directly.

## 9. Local immutable edits

**Choice:** Copy arrays before removal or reordering, using stable stop IDs. **Reason:** Existing state and failed request snapshots must stay unchanged; using array indexes for identity would confuse expansion after reordering. **Considered:** drag-and-drop, which adds interaction complexity and accessible alternatives; move-up/down buttons already satisfy the assignment and work on keyboards and phones.

## 10. Abort plus request identity

**Choice:** Abort the old request and also compare a monotonically increasing request number before every result/error update. **Reason:** Aborting cannot erase a response that has already arrived. **Considered:** disabling the form until a request finishes, which does not protect cancellation, session loading, or future extensions. Obsolete responses and errors are ignored. Editing or loading after failure clears Retry so an old snapshot cannot undo the newer work.

## Library research

- React and Vite: a functional-component UI with a development proxy; Vite 8 supports the installed Node runtime. Versions are locked in pnpm.
- Zod 4: strict objects, union schemas, runtime validation, and inferred types; provider structure is separated from local relationship checks.
- OpenAI SDK: Microsoft's Azure Responses/structured-output examples use its Zod helper; the configured endpoint and model were tested live.
- Vitest and Testing Library: deterministic logic and hook tests, including controlled out-of-order promises.
- Playwright Test: real installed Chrome for reproducible user-flow/mobile tests, rather than an additional global browser runner.
- Express: bounded JSON parsing and one server route, rather than manual stream/body parsing.
- tsx and concurrently: readable TypeScript server development and one portable start command, rather than a bespoke process launcher.

References: [Azure structured outputs](https://learn.microsoft.com/azure/foundry/openai/how-to/structured-outputs), [Vite](https://vite.dev/guide/), [Zod](https://zod.dev/).

## 11. Five manual local saves

**Choice:** Save explicitly, update the current session ID, and retain the five most recent saves in one versioned localStorage key. **Reason:** This provides the requested save/reload behavior without an account or backend database. **Considered:** autosaving on every edit, which makes persistence and recovery harder to explain, and cloud sessions, which require additional infrastructure. Corrupt data is preserved until the user explicitly confirms a reset of this app's storage key.

## 12. Typed blocks with derived chart values

**Choice:** A strict union of a travel-tip card, checklist, and chart descriptor. The chart uses current stop durations. **Reason:** Distinct model output becomes distinct UI, and local edits cannot make the chart disagree with the itinerary. **Considered:** raw JSON panels and AI-generated totals, which are not meaningful interactive rendering; a chart library would be excessive for a few horizontal bars. CSS bars plus numeric labels remain readable without visual interpretation.

## 13. Full refinement replacement

**Choice:** Send the current edited itinerary and accept a whole validated replacement. **Reason:** This is much easier to explain than an AI-generated patch protocol. **Considered:** JSON Patch and per-field merge logic, which add validation and identity complexity. The cost is that scope/ID preservation depends partly on the model; this is disclosed. A failed refinement never commits any partial change.

## 14. Bounded requests and timeouts

**Choice:** Seven days, eight stops per day, bounded strings/blocks, a 512 KiB body cap, a 30-second SDK timeout, and a 35-second client timeout. **Reason:** This keeps a basic project predictable while allowing valid edited itineraries to be sent back. **Considered:** a 64 KB cap from an early draft, which could reject a valid maximum-sized refinement; a heavily escaped/Unicode fixture checks the relationship. Unlimited size and indefinite waiting would make bad output expensive and difficult to recover from.

## 15. Theme, typography, and motion

**Choice:** Read the OS theme initially, allow a user toggle, use shared CSS tokens, a familiar serif heading face and system body font, and respect reduced motion. **Reason:** The planner should be readable in the user's viewing conditions without loading another asset service. **Considered:** one fixed theme, remote fonts, and decorative animation scenes; they add little to this assignment. Inline spaces remain around responsive line breaks so hiding a break cannot concatenate words on mobile.

## 16. Lucide icons and Prettier

**Choice:** Lucide for the repeated control icons and Prettier for source formatting. **Reason:** A maintained icon system gives consistent strokes and accessible decorative use; a formatter expands JSX and keeps future changes readable. **Considered:** writing every SVG by hand and manually formatting every prop, which create maintenance work without changing the product. Neither library introduces an application abstraction or state layer.

## 17. Testing libraries at the right boundaries

**Choice:** Vitest for deterministic logic, Testing Library for hooks/components, Supertest for Express requests, and Playwright Test for installed Chrome. **Reason:** Each supplies a demonstrated capability rather than duplicating another runner. **Considered:** bespoke HTTP test servers and browser scripts, which would obscure the tests. Fixtures are isolated to tests; live Azure generation/refinement remain separate verification.

## 18. One local production origin

**Choice:** The built Express app serves the static client and API together and binds to loopback. **Reason:** This verifies the production build without exposing a paid model endpoint publicly. **Considered:** separate deployed frontend/backend origins and CORS setup, which are unnecessary for local delivery. Deployment, credentials, rate limiting, and public access are explicitly deferred rather than silently enabled.

## 19. Recommended scope first

**Choice:** Finish core failure handling, saving, refinement, typed blocks, and bounded polish; leave streaming and drag-and-drop out. **Reason:** The assignment values a reliable core, and the user chose an eight-hour priority. **Considered:** incremental JSON previews, which need new framing/parsing/cancellation tests, and richer travel services such as maps/bookings, which are outside the brief. A recording and explanatory docs help the user understand and present what actually shipped.

## 20. A runtime floor that matches the locked tools

**Choice:** Require Node 26 or later, the runtime used for verification. **Reason:** Vite's lower minimum alone does not cover the current locked jsdom test dependency. **Considered:** downgrading the test environment to support older runtimes; there is no stated need for that, and it would change tooling already verified here. The README and package engine now agree instead of advertising unsupported Node 22.12 compatibility.

## 21. A deadline beyond the SDK default

**Choice:** Combine a 30-second timeout signal with caller cancellation as well as the SDK's timeout. **Reason:** Review reproduced an SDK edge where a response's headers arrived but its error body stalled after the SDK fetch timer was cleared. **Considered:** relying on the browser's later timeout, which protects the screen but leaves the server boundary weaker than promised. A small extra signal covers transport/body completion and maps expiry to the existing safe 504 error; a regression test reproduces a stalled error body without a live paid call.
