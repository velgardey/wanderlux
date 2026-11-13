# Request reliability and Tailwind migration

The user reported “This is taking too long. Try again.” and requested Tailwind CSS while retaining simple, understandable code.

## Scope and choices

1. Trace the live browser/proxy/API/provider path and reproduce the timeout. Keep the deployment, structured-output contract, manual retry, cancellation, and previous-plan protection. Give valid slower requests a bounded, shared deadline if evidence shows 30 seconds is insufficient. Test a response that completes beyond the old deadline, as well as cancellation and the new deadline.
2. Use Tailwind v4's official Vite plugin. Preserve the existing visual design, copy, themes, responsiveness, and keyboard behavior. Put layout and typography utilities in JSX; keep repeated control styles in a small `@layer components` block using `@apply`. Share the existing light/dark CSS variables through `@theme inline`. This is simpler than repeating control utility lists or introducing a component kit. A wholesale redesign and a separate Tailwind JavaScript configuration are unnecessary.
3. Update provider/client/UI timeout callers, regression tests, Vite config, package lock, all four rendering components, the stylesheet, and teaching documentation. Replace CSS-dependent browser locators with stable test IDs where necessary. Run unit/API tests, real Azure generation/refinement, typecheck/build, desktop/mobile browser tests, and inspect both themes.

## Work

- [x] Reproduce and fix the request timeout, with a regression.
- [x] Install and migrate Tailwind without changing planner behavior.
- [x] Verify the complete app and document findings and extension guidance.

Evidence: old seven-day request HTTP 504 at 30.1 seconds; new request HTTP 200 in 31.3 seconds; refinement HTTP 200 in 28.9 seconds. The simulated 45-second success regression failed before the fix and passed afterward. 61 unit/component/API tests, 8 desktop/mobile browser tests, typecheck, and production build passed. Populated desktop light/dark and 320px mobile layouts were inspected; the design detector returned no findings.

Streaming, background jobs, public deployment, and discarded mockups remain outside this change.
