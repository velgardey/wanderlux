# Wanderlux trip planner

A small React app that turns a free-form trip brief into an editable day-by-day itinerary. Expand, reorder and remove stops, refine the current plan, save trips locally, and explore locations on an interactive map. Built with TypeScript, React, Tailwind CSS and Express, using an Azure OpenAI / Foundry **GPT 6 Luna deployment through the Responses API**.

See the [demo recording](output/trip-planner-demo.mp4).

## Run locally

Requirements: Node **26.x** and pnpm. `.node-version` pins the verified Node 26.13.0 release; `packageManager` pins pnpm 12.18.0. Dependencies are locked in `pnpm-lock.yaml`.

```powershell
git clone https://github.com/velgardey/wanderlux.git
cd wanderlux
pnpm install --frozen-lockfile
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

The commands above use PowerShell. On macOS or Linux, use `cp .env.example .env` to copy the environment template.

### Production build

```powershell
pnpm build
pnpm serve
```

Open [the built planner](http://127.0.0.1:3001). Express serves the built client and API on the same origin. Local runs bind to loopback by default; `HOST=0.0.0.0` allows a hosting platform to reach the server. The server uses the platform's `PORT` when supplied.

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
