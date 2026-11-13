# Minimal itinerary map

The user authorized the map outlined in the prior conversation and removal of the two AI disclosure lines and page footer. This is a local trip-planning tool, with readable code and established libraries.

## Design and choices

- React Leaflet 5 and Leaflet 1.9.4 provide maps, popups, keyboard-accessible markers, and polylines. React Leaflet 5 supports the installed React 19. Add Leaflet types for TypeScript.
- An optional Show map button follows the stop list. Lazy-load the map library only when opened. Resolve locations progressively, separately from generation; hide/unmount aborts pending lookups. Existing form/stop keyboard order is preserved.
- Photon converts each distinct stop.location into validated coordinates and a matched-place label. The Express proxy serializes outbound lookups at least one second apart, caches up to 256 results in memory, and uses a bounded deadline. A configurable Photon URL permits switching away from the public demo without a code change.
- Number pins by day and stop position; color by day. Group identical coordinates so colocated stops remain accessible. Draw straight segments only between adjacent resolved stops. Popups show the stop and matched location. Fit all resolved points; preserve a bounded zoom for one point. Unresolved places and failures get a clear notice/retry; editing/saving continues to work.
- Keep coordinate state separate from itineraries and saved sessions; no data migration. Ask the provider to use searchable place names including city/country in the existing location field.
- Remove the service-disclosure paragraph, AI suggestions paragraph, and footer. Keep map attribution, stop assumptions, and ordinary error handling.

## Alternatives considered

AI-generated coordinates are simpler to request but can place believable pins at incorrect locations. Google Maps adds billing/credentials for functionality already provided by Leaflet. Public Nominatim has a policy requiring an informed application-developer decision, so it is not silently configured. Photon's public demo explicitly permits reasonable project use, with throttling and no availability guarantee. Use it for this local demo; a public product needs an appropriate hosted/private service.

References: https://react-leaflet.js.org/docs/start-setup/ and https://github.com/komoot/photon#demo-server. Photon returns GeoJSON coordinates in longitude/latitude order; Leaflet uses latitude/longitude. This is tested at the boundary. Map tiles use OpenStreetMap attribution and normal browser caching; no bulk downloading.

## Verification

Test provider shape/ranges, longitude/latitude conversion, caching, serialized requests, safe failure and cancellation. Test progressive lookup state, stale response protection, retry and edited itineraries. Run the existing full suite/build and Chrome desktop/mobile browser flows, including map markers/popups/reordering and narrow-screen layout. Smoke-test the live geocoder once and inspect real tiles visually. No driving directions, route optimization, autocomplete, or paid provider is needed.
