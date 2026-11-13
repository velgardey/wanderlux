# Itinerary map implementation plan

> Use superpowers:executing-plans to implement this small change in the existing feature checkout. Steps use checkboxes for progress.

**Goal:** Add an optional readable map and remove the requested AI disclosure/footer copy.
**Architecture:** React Leaflet renders separately resolved locations; Express validates/caches/serializes Photon lookups. Itinerary and saved-session schemas stay unchanged.
**Tech stack:** Existing React/Express/Zod/Vitest/Playwright; React Leaflet 5, Leaflet 1.9.4 and Leaflet types.
**Spec:** ../specs/2026-11-13-itinerary-map-design.md

## Global constraints

Use pnpm from C:\Projects\wanderlux. Preserve the configured Azure Responses deployment, 120/130-second deadlines, save format and request race guards. Keep the local feature branch and discarded materials. Photon lookups run only on Show map, at most once per second with a 256-entry process cache. No new state, geocoding wrapper or routing library.

## Review focus

Untrusted/out-of-range coordinates, failed/missing locations, stale results after hide/edit/load, colocated stops, and map behavior at 320px. These must not break ordinary trip actions.

## Task 1: Map lookup boundary

Files: shared/map.ts, server/geocodeLocation.ts, server/index.ts, src/lib/locations.ts, .env.example, tests/geocodeLocation.test.ts, tests/locations.test.ts.

Interface: GET /api/location?query=<location> returns { location: { latitude, longitude, label } | null }, or the existing safe error envelope. geocodeLocation(query: string, signal: AbortSignal): Promise<MapLocation | null>. requestLocation uses the same result schema.

- [x] Add failing tests for conversion/validation/cache/throttle/cancellation and safe browser handling.
- [x] Implement the shared schema and Photon proxy using native fetch/AbortSignal and the existing Zod/PlannerError.
- [x] Verify the focused tests, then smoke-test a real place via the local API.

## Task 2: Optional map and copy cleanup

Files: src/hooks/useMapLocations.ts, src/components/ItineraryMap.tsx, src/components/MapView.tsx, src/App.tsx, src/styles.css, server/generateItinerary.ts, tests/useMapLocations.test.tsx, tests/planner.spec.ts, package files and documentation.

Interface: ItineraryMap receives itinerary: Itinerary. It owns show/hide state and lazy-loads MapView; MapView resolves current locations and derives pins/segments from current stops.

- [x] Add failing hook regressions for duplicate locations, progressive results, edits, cancellation/stale results and retry; add map browser flow.
- [x] Install matched map libraries. Implement the map and remove the two disclosure paragraphs and footer.
- [x] Verify all unit/API tests, typecheck/build and Chrome desktop/mobile tests.
- [x] Inspect real map tiles and 320px layout; close task-owned browser; review once.
- [x] Document decisions/extension/debugging boundaries, update build log, remove task-only artifacts, commit locally.

Final evidence: 84 tests, 16 Chrome browser tests and build/typecheck passed. Live Photon and real tiles worked. Review fixes were verified by failed-download recovery and long-popup regressions; no second review/suite run is needed absent new code changes. See BUILD_LOG.md.
