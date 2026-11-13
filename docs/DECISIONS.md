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
