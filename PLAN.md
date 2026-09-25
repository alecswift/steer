# Steer MVP Plan

**Created**: 2026-09-24
**Based on**: [SPEC.md](SPEC.md)
**Approach**: Build in small, ordered chunks. Each chunk is roughly **one commit and under an hour**, and ends with a **Verify** step: automated tests where they fit, plus a short manual check. Chunks are grouped into phases, and each phase ends in a **milestone** you can demo. Chunks tagged *(UI)* are built with the **frontend-design** Claude Code plugin (see Decisions).

---

## Decisions

These were settled while planning and resolve open items in the spec.

| Topic | Decision |
|---|---|
| Routing engine (FR-012) | **Self-hosted BRouter**, called only by Phoenix through a `Steer.Routing` adapter. The frontend never talks to BRouter directly. |
| Segment files | **Open.** Solved in chunk 6.2 (see "Open questions"). |
| Elevation source | Snapped legs use **BRouter's Z values**. Straight fallback legs get Z sampled from **AWS Terrarium tiles in Phoenix**. |
| Repo layout | `web/` (Vite + React) and `server/` (Phoenix). `docker-compose.yml` at the root. |
| Local infra | **Docker Compose** runs PostGIS, BRouter and the telemetry stack. Phoenix and Vite run natively. |
| Telemetry | Telemetry is **central to the project**. **OpenTelemetry** is used everywhere, for structured logs, traces, metrics, product events and errors. The data goes to a **Grafana LGTM** container (Loki, Grafana, Tempo, and Prometheus/Mimir for metrics) in Docker Compose. It starts in Phase 0 (browser) and Phase 2 (Phoenix), and **every chunk after that adds its own telemetry** (see "Telemetry conventions"). The same OpenTelemetry setup can later send to a hosted service by changing an endpoint. |
| Testing | **ExUnit** (backend), **Vitest** (frontend logic), and **manual verify steps** in every chunk. No end-to-end tests in the MVP. |
| Frontend design | All UI work (components, layout, styling, dialogs, map marker and line styles) uses Anthropic's **frontend-design** Claude Code plugin. Chunk 0.12 sets up the shared design foundation, and every *(UI)* chunk builds on it so the app looks consistent. |
| CI | A **GitHub Actions** workflow runs **oxlint** on every PR and on pushes to `main`. There's no deploy (CD) step until hosting is decided. |
| Auto-generated names | **Stats-based**, e.g. `5.2 mi loop · Sep 24` or `3.1 mi route · Sep 24`. Duplicates get ` (2)`, ` (3)`, … Generated on the backend. |
| Unsaved-changes warning | **In-app confirm dialog** when leaving edit mode, and a **browser `beforeunload`** warning on refresh or tab close. |
| Snap UX | **Optimistic**. A dashed straight leg appears right away and is replaced by the snapped geometry when it arrives. |
| Default map view | **Snoqualmie Pass**, framed from Mount Defiance, Web Mountain and Bandera in the west to Guye, Kendall and Kaleetan in the east. Defined as bounds, not center and zoom, so it frames the same area on any screen size. This area is also the test area for seeds and routing checks. |
| Peak data | Comes from the base map's own `mountain_peak` tile layer (`name`, `ele`, `ele_ft`, `rank`, available from zoom 7). The Liberty style doesn't draw it, so Steer adds its own layer. No backend is needed. |
| Peak links | **SummitPost** and **WTA** only. AllTrails is dropped because there's no API and its terms forbid scraping. Links are shown only for peaks in **Washington State**, checked against a simplified state outline (a bounding box would also catch parts of Oregon, Idaho and BC). They're built from each site's **search URL**, with a small **curated list** of exact pages for the Snoqualmie peaks that takes priority. Peaks outside Washington still show their name and elevation, with no links. |
| Map layers | Hillshade, contours and trails are **always on**. There are no layer toggles in the MVP; they're future work. In view mode, only the **saved route selected in the sidebar** is drawn. In edit mode, the active route remains visible, even if unsaved. |
| Storage units | Metric in the database and API. Converted to imperial for display only (FR-010). |

### Open questions (decided in the chunk that needs them)

- **Search URL formats** (chunk 1.6): confirm the current search URL for SummitPost and WTA.
- **Phoenix metrics export** (chunk 2.7): the OpenTelemetry metrics SDK for Erlang and Elixir is still experimental. Choose between it and PromEx exposing `/metrics` for Prometheus to scrape.
- **Elevation noise** (chunk 3.4): whether gain/loss needs a small smoothing threshold.
- **BRouter Docker image** (chunk 6.1): build from the upstream repo's Dockerfile or use a community image.
- **BRouter segment acquisition** (chunk 6.2): download on demand, download the whole world upfront, or a configurable region list.
- **PNG decoding in Elixir** (chunk 6.5): pick a library to read Terrarium tiles.

### Later (after the MVP)

- **Layer toggles**: switches to show or hide topography (contours) and hillshade, and possibly to show all saved routes at once. Remembering the choices ties in with User Settings.
- **Bulk exact links from Wikidata**: check how many Washington peaks in Wikidata have SummitPost IDs, matched through the OSM `wikidata` tag. If enough do, import them into a Postgres table so exact links cover thousands of peaks, not only the hand-curated few.

---

## Telemetry conventions

**Rule for every chunk**: a chunk that adds behavior also adds its telemetry: the events, spans or metrics listed below, or new ones that follow these conventions. Its **Verify** step includes finding them in Grafana. A chunk isn't done until its telemetry shows up.

- **Event names**: lowercase `area.action`, e.g. `peak.selected` or `route.saved`. Attributes use `snake_case`.
- **Metric names**: prefixed `steer.`, with the unit in the name, e.g. `steer.snap.duration_ms`.
- **Correlation**: every log and event carries `session.id`, plus the trace and span IDs when there is an active span. Browser `fetch` calls send a `traceparent` header, so one trace runs from browser to Phoenix to Postgres or BRouter.
- **Privacy**: no personal data. The MVP has a single user and no accounts. Route coordinates stay out of telemetry; send IDs and stats instead.
- **Safe**: telemetry failures never affect the app.
- **Success criteria as metrics**: each measurable success criterion in the spec gets a metric and a dashboard panel, so its target can be checked from real use.

### Telemetry catalog

| Signal | Kind | Attributes / notes | Chunk |
|---|---|---|---|
| `app.loaded` | event + histogram | map load time | 0.10 |
| Frontend errors | error log | message, stack trace, component | 0.9 |
| HTTP requests | Phoenix spans + metrics | route, status, duration | 2.5, 2.7 |
| Database queries | Ecto spans | query source, duration | 2.5 |
| `peak.selected` | event | `peak_name`, `in_washington`, `has_curated_links` | 1.3 |
| `steer.peak.select_to_panel_ms` | histogram (client) | From the `peak.selected` click to the peak details panel rendering; **SC-006** panel, p95 under 100 ms | 1.4 |
| `peak.link_opened` | event | `site` (summitpost / wta), `link_type` (exact / search) | 1.8 |
| `route.selected` | event | `route_id` | 4.3 |
| `editor.opened` | event | `mode` (new / existing) | 5.1, 9.2 |
| `editor.point_added`, `editor.undo`, `editor.redo`, `editor.cleared`, `editor.loop_closed` | events | `point_count` | 5.3, 5.4 |
| BRouter call | span | status, `no_route`, duration | 6.4 |
| `steer.snap.fallback` | counter | `reason` (no_route / timeout / error) | 6.7 |
| `steer.dem.tile_cache` | counter | `result` (hit / miss) | 6.5 |
| `steer.snap.duration_ms` | histogram (server and client) | `snapped`; **SC-001** panel, p95 under 1000 ms | 6.8, 7.3 |
| `snap.failed` | event | `reason` (network / server) | 7.4 |
| `route.saved` | event | `mode` (new / existing), `named` (true/false), `distance_mi`, `leg_count`, `straight_leg_count` | 8.3, 9.3 |
| `steer.editor.time_to_save_s` | histogram | from `editor.opened` to `route.saved`; **SC-002** panel, under 120 s | 8.3 |
| `route.save_failed` | error event | `reason` | 8.3 |
| `editor.discard_prompted`, `editor.discarded` | events | `trigger` (cancel / beforeunload) | 8.4, 8.5 |
| `route.deleted` | event | `route_id` | 9.1 |
| `steer.route.select_to_fit_ms` | histogram | **SC-003** panel | 4.3 |

---

## Phase 0: Foundations (repo, CI, telemetry, design)

- [x] **0.1 Move the Vite app into `web/`**
  Move `src/`, `public/`, `index.html`, `package*.json`, `tsconfig*.json`, `vite.config.ts`, and `.oxlintrc.json` into `web/`. Update `.gitignore` and reinstall `node_modules`.
  *Verify*: `cd web && npm run dev` shows the same map as before. `npm run build` and `npm run lint` pass.

- [x] **0.2 GitHub Actions lint workflow**
  Add `.github/workflows/lint.yml`. It runs on pushes to `main` and on every pull request:
  - check out the repo
  - `actions/setup-node` with Node 24 and npm caching keyed on `web/package-lock.json`
  - `npm ci` and `npm run lint` (oxlint) in `web/`

  The build fails on lint errors; warnings are allowed. There's no deploy step yet, because hosting isn't decided.
  *Verify*: push a branch and open a PR. The lint check passes. A commit with a deliberate lint error (e.g. a hook called inside a condition) fails the check.

- [x] **0.3 Pull map config and styles out of `App.tsx`**
  This is a refactor only; nothing on screen should change except the default view.
  - `src/map/config.ts`: the default view, the base style URL, and the DEM tile URL.
  - Change the default view from Mt. Rainier to Snoqualmie Pass. Use `initialViewState.bounds` of `[[-121.61, 47.40], [-121.36, 47.48]]`, which covers every peak listed below with a little margin.

    | Peak | Lon, Lat |
    |---|---|
    | Web Mountain | -121.5911, 47.4422 |
    | Mount Defiance | -121.5644, 47.4354 |
    | Little Bandera Mountain | -121.5478, 47.4180 |
    | Bandera Mountain | -121.5384, 47.4156 |
    | Kaleetan Peak | -121.4782, 47.4625 |
    | Snoqualmie Mountain | -121.4165, 47.4589 |
    | Guye Peak | -121.4089, 47.4420 |
    | Kendall Peak | -121.3849, 47.4430 |

    These coordinates come from the `mountain_peak` layer in the OpenFreeMap tiles.
  - `src/map/dem.ts`: the `DemSource` setup, including `setupMaplibre`.
  - One file per layer spec (`hillshade.style.ts`, `contours.style.ts`, `trails.style.ts`, `route.style.ts`), kept next to its layer component in `src/components/map/layers/` (see 0.4). Each spec has only one consumer, so it lives with that component; `src/map/` holds only the shared, non-React setup.

  *Verify*: the map looks the same as before, except that it opens on Snoqualmie Pass with all the listed peaks in view. Build and lint pass.

- [x] **0.4 Split the map into components**
  This is also a refactor only.
  - `src/components/map/MapView.tsx`: the `<Map>` wrapper, which renders the layer components.
  - `src/components/map/layers/`: `HillshadeLayer.tsx`, `ContourLayer.tsx` (lines and labels), `TrailsLayer.tsx`, and `RouteLayer.tsx`. Each one owns its `<Source>` and `<Layer>`, and sits next to its `*.style.ts` spec.
  - `App.tsx` becomes a thin shell that renders `MapView`, ready for the sidebar and mode state that come later.
  - Hillshade, contours and trails are always on. There are no layer toggles in the MVP.

  *Verify*: the map looks the same as before. Build and lint pass.

- [x] **0.5 Add Vitest**
  Add Vitest and an `npm test` script, with one trivial test.
  *Verify*: `npm test` passes.

- [x] **0.6 Docker Compose with PostGIS**
  Add a root `docker-compose.yml` with a `db` service (a PostGIS image, a named volume, and port 5432).
  *Verify*: `docker compose up -d db`, then `SELECT postgis_full_version();` works in psql.

- [ ] **0.7 Telemetry stack in Docker Compose**
  - Add a `telemetry` service using the `grafana/otel-lgtm` image. It includes an OpenTelemetry collector, Loki (logs), Tempo (traces), Prometheus (metrics) and Grafana.
  - Ports: Grafana on `3001:3000` (Vite already uses 3000), OTLP gRPC on `4317`, OTLP HTTP on `4318`. Add a named volume so data survives restarts.

  *Verify*: `docker compose up -d telemetry`, then Grafana opens at `localhost:3001` with the Loki, Tempo and Prometheus data sources available.

- [ ] **0.8 Browser tracing**
  - Add `src/telemetry/` with the OpenTelemetry web SDK: a tracer provider, the OTLP HTTP exporter and a batch span processor.
  - The resource is `service.name=steer-frontend` plus `service.version` and `deployment.environment=dev`.
  - Turn on document-load and `fetch` instrumentation. `fetch` adds `traceparent` headers to `/api` calls, so traces continue into Phoenix later.
  - Add a Vite dev proxy from `/otlp` to `localhost:4318`, so the browser sends same-origin requests and no CORS setup is needed.
  - Telemetry must never break the app: if export fails, drop the data quietly.

  *Verify*: load the app, then find the `documentLoad` trace for `steer-frontend` in Grafana → Tempo.

- [ ] **0.9 Browser logs and errors**
  - Add a `log.debug/info/warn/error(message, attrs)` wrapper that emits OpenTelemetry log records (OTLP HTTP to Loki) carrying the active trace and span IDs. It also prints to the console in dev.
  - Add global `error` and `unhandledrejection` handlers, and a top-level React error boundary. Each one logs at `error` level with the stack trace.
  - Add a per-tab `session.id` attribute.

  *Verify*: a Vitest test covers the wrapper's attributes. By hand, throw a test error from the console and find it in Loki with its session ID and stack trace.

- [ ] **0.10 Product events and metrics**
  - `track(name, attrs)` emits a product event: an OpenTelemetry log record with `event.name` (names follow the "Telemetry conventions" section), and it also increments a `steer.events` counter labelled by event name.
  - `metrics.histogram(name)` and `metrics.counter(name)` helpers use the OpenTelemetry metrics SDK with the OTLP exporter.
  - Emit the first event, `app.loaded`, with the map load time as an attribute and a histogram.

  *Verify*: a Vitest test checks that `track` emits the right record. In Grafana, `app.loaded` shows up in Loki and `steer_events_total` in Prometheus.

- [ ] **0.11 Steer dashboard as code**
  - Add `telemetry/grafana/dashboards/steer.json` and a provisioning file mounted into the `telemetry` container.
  - Start with these panels: an event count by name, recent frontend errors, and the `app.loaded` time. Later chunks add panels for success criteria, including SC-001 snap time, SC-002 time to save, and SC-006 peak click-to-panel-render latency (p95 under 100 ms, added in 1.4).

  *Verify*: after restarting the container, the Steer dashboard appears in Grafana with live data.

- [ ] **0.12 Design foundation with frontend-design** *(UI)*
  - Install the frontend-design plugin in Claude Code (via `/plugin`; confirm the marketplace name when installing).
  - Use it to set a visual direction suited to a topographic hiking app, and to create `src/styles/tokens.css` with the colors, type scale, spacing, radii and shadows. Define light and dark values.
  - Put the map route color (currently `#e6532c`) and the trail color in the tokens as well, so map layers and UI share one palette.
  - Record the direction in a short `web/DESIGN.md` so later *(UI)* chunks follow it.

  *Verify*: the map still renders, the tokens load globally, and `DESIGN.md` exists. Build and lint pass.

- [ ] **0.13 Root README for developers**
  Replace the Vite template text with setup and run steps for the new layout, including the telemetry stack and where to find the Steer dashboard. Keep the About section.
  *Verify*: following the README from a clean checkout starts the frontend, the database and the telemetry stack.

**Milestone 0**: The frontend runs from `web/` as modular components, lint runs in CI on every PR, the database and telemetry stack run in Docker, the browser sends traces, logs, errors and product events to Grafana, the test runner works, and there's a design foundation for the UI.

---

## Phase 1: Peak links (US6)

Clicking a named peak on the map selects it. The sidebar then shows the peak's name and elevation. For peaks in Washington State, it also shows links to SummitPost and WTA.

This phase is frontend-only and uses data the map tiles already contain, so it doesn't depend on the backend. It also builds the sidebar and the selection model that the routes phases reuse later.

- [ ] **1.1 Imperial formatting utilities (FR-010)**
  `formatMiles(m)`, `formatFeet(m)`.
  *Verify*: Vitest tests.

- [ ] **1.2 Clickable peak layer** *(UI)*
  - Add a `PeakLayer` component on the base map's `openmaptiles` source, `mountain_peak` source-layer, filtered to `class == 'peak'` features that have a `name`.
  - It draws a small marker and a name label for each peak. Lower `rank` values show at lower zooms, so the major peaks appear first.
  - The cursor turns into a pointer when hovering a peak.

  *Verify*: every peak in the 0.3 table shows as a labelled peak, and hovering one shows a pointer.

- [ ] **1.3 Sidebar shell and selection** *(UI)*
  - A right-hand `Sidebar` next to the map, with an empty state ("Select a peak").
  - App-level selection state with two independent parts: `selectedPeak` (set here) and `selectedRouteId` (added in Phase 4). Choosing a peak doesn't clear the route, and choosing a route doesn't clear the peak.
  - The sidebar panel shows the peak while one is selected, and a close button on the panel clears it.
  - Clicking a peak selects it and emits `peak.selected`, recording the click time for the latency histogram in 1.4. Clicking empty map clears the peak only.

  *Verify*: a Vitest test covers the selection logic. By hand, check that clicking a peak updates the sidebar and that the map resizes correctly next to it. Confirm `peak.selected` appears in Grafana.

- [ ] **1.4 Peak panel** *(UI)*
  The sidebar shows the peak's name, its elevation in ft ("Elevation unknown" when the tiles have none), and its coordinates. Record `steer.peak.select_to_panel_ms` from the click that emits `peak.selected` until the details panel renders; add an SC-006 dashboard panel showing p95 against the under-100-ms target.
  *Verify*: Kendall Peak shows 5,781 ft. Easter Island (a small named point near Mount Washington that has no elevation in the tiles) shows "Elevation unknown". Click peaks and confirm the histogram and SC-006 panel show click-to-panel-render latency in Grafana.

- [ ] **1.5 Washington check**
  - Add `src/data/washington.json`, a simplified Washington State outline (roughly 100 points) made from the public-domain US Census cartographic boundary files.
  - `isInWashington(lon, lat)` does a point-in-polygon test against it (e.g. `@turf/boolean-point-in-polygon`), after a quick bounding-box check first.

  *Verify*: Vitest tests. Inside: Snoqualmie peaks, Rainier, Mount Olympus, Steptoe Butte. Outside: Mount Hood, Mount Defiance in Oregon, Scotchman Peak (Idaho), Mount Slesse (BC).

- [ ] **1.6 Search links**
  `peakLinks(peak)` returns links for **SummitPost** (peak pages) and **WTA** (hikes) for peaks in Washington, and no links for peaks outside it. Confirm each site's current search URL format in this chunk.
  *Verify*: Vitest tests check that the URLs are encoded correctly and that links are left out for peaks outside Washington.

- [ ] **1.7 Curated exact links**
  - Add `src/data/peakLinks.ts`: exact SummitPost and WTA pages for the peaks in the 0.3 table.
  - Match entries by peak name plus a small distance check, so a different peak with the same name doesn't pick up the wrong links (e.g. Mount Defiance in Oregon).
  - Curated links take priority over search links, one site at a time.

  *Verify*: a Vitest test checks the priority order. By hand, open each curated link and check that it goes to the right page.

- [ ] **1.8 Show the links in the peak panel** *(UI)*
  - Show the links as buttons labelled "SummitPost" and "WTA hikes". Each opens in a new tab with `rel="noopener noreferrer"`.
  - Search links are marked as searches, so it's clear they aren't exact pages.
  - Peaks outside Washington show "Links are available for Washington peaks only" in place of the buttons.

  *Verify*: click a Snoqualmie peak and check the exact pages open. Click other Washington peaks (e.g. Mount Baker, Mount Olympus) and check the search links open. Click Mount Hood and check it shows name and elevation with the notice.

**Milestone 1**: US6 is done. Clicking a peak shows its details, with SummitPost and WTA links for Washington peaks.

---

## Phase 2: Backend skeleton

- [ ] **2.1 Generate the Phoenix API app**
  `mix phx.new server --app steer --no-html --no-assets --no-live --no-mailer --no-dashboard --no-gettext --binary-id`. Point the dev and test database config at the Compose database.
  *Verify*: `mix ecto.create` and `mix test` pass.

- [ ] **2.2 Health endpoint**
  `GET /api/health` returns `{"status":"ok"}`, with a controller test.
  *Verify*: `mix test`, and `curl localhost:4000/api/health` works.

- [ ] **2.3 PostGIS and `geo_postgis`**
  Add `geo_postgis`, a migration that enables the `postgis` extension, and a custom Postgrex types module.
  *Verify*: `mix ecto.migrate` succeeds, and `mix test` still passes.

- [ ] **2.4 Vite proxy to Phoenix**
  In `vite.config.ts`, proxy `/api` to `localhost:4000` so no CORS setup is needed. Temporarily log `/api/health` from the app.
  *Verify*: the browser console shows the health response. Remove the log afterwards.

- [ ] **2.5 Phoenix tracing**
  - Add `opentelemetry`, `opentelemetry_exporter`, `opentelemetry_phoenix`, `opentelemetry_bandit` and `opentelemetry_ecto`.
  - Export over OTLP to the `telemetry` container, with `service.name=steer-backend`.
  - Incoming `traceparent` headers continue the browser's trace.

  *Verify*: calling `/api/health` from the app shows **one trace** in Tempo that runs from `steer-frontend` into `steer-backend`.

- [ ] **2.6 Structured JSON logs**
  - Add `LoggerJSON` (or a similar library) so Phoenix logs are JSON and carry the trace and span IDs.
  - Send them to Loki through the collector (the OTLP log exporter, or collecting from stdout; decide in this chunk).
  - Add a `Steer.Telemetry.event/2` helper for backend product events with the same `event.name` shape as the frontend's `track`.

  *Verify*: an ExUnit test for `event/2`. In Grafana, the `/api/health` log line opens its trace in Tempo.

- [ ] **2.7 Phoenix metrics**
  - Export Phoenix, Ecto and BEAM VM metrics: request rate and duration by route, database query time, and memory.
  - Choose the exporter here (see "Open questions").
  - Add a backend row to the Steer dashboard.

  *Verify*: request rate and duration for `/api/health` appear in Prometheus and on the dashboard.

**Milestone 2**: The frontend can reach a Phoenix API backed by PostGIS. Browser → Phoenix → Postgres shows up as one trace, with logs and metrics in Grafana.

---

## Phase 3: Data model and routes API

- [ ] **3.1 Users and the implicit default user**
  A `users` table (id and timestamps only), a seed with one default user, and `Steer.Accounts.default_user/0`.
  *Verify*: an ExUnit test for `default_user/0`.

- [ ] **3.2 Routes table**
  Migration with the following columns:
  - `id`
  - `user_id` (foreign key)
  - `name`
  - `waypoints` (jsonb, an ordered `[{lon, lat, geometry_index}]`)
  - `geometry` (`LineStringZ`, SRID 4326)
  - `distance_m`
  - `min_ele_m`
  - `max_ele_m`
  - `gain_m`
  - `loss_m`
  - timestamps

  `geometry_index` is the vertex in `geometry` where each waypoint lands. It lets edit mode split the line back into legs without re-snapping.
  *Verify*: `mix ecto.migrate` and a rollback both work.

- [ ] **3.3 Route schema and changeset**
  Validations: at least 2 waypoints, geometry present, and user required.
  *Verify*: ExUnit changeset tests for valid and invalid cases.

- [ ] **3.4 Stats computation**
  - `Steer.Routes.Stats`: distance with `ST_Length(geometry::geography)`, and min/max/gain/loss from the Z values.
  - Decide here whether gain/loss needs a small noise threshold.

  *Verify*: ExUnit tests with fixed lines whose stats are known (flat, climbing, up then down).

- [ ] **3.5 Assemble a route from legs**
  `Steer.Routes.build/1` takes `waypoints` and `legs` (`[{coordinates: [[lon,lat,z]], snapped: bool}]`) and does the following:
  - joins the legs into one line, removing duplicate joint vertices
  - computes each waypoint's `geometry_index`
  - computes the stats

  *Verify*: ExUnit tests covering 2 legs, 3 legs, and a closed loop.

- [ ] **3.6 Auto-generated names**
  If the name is blank, generate `"{distance} mi {loop|route} · {Mon D}"`. It's a loop when the first and last waypoint are the same. Add ` (n)` when the name already exists for that user.
  *Verify*: ExUnit tests for the loop, route, and duplicate cases.

- [ ] **3.7 Routes context CRUD**
  `list_routes/1`, `get_route!/2`, `create_route/2`, `update_route/2`, `delete_route/1`, all scoped to a user.
  *Verify*: ExUnit context tests.

- [ ] **3.8 Routes JSON API**
  - Endpoints: `GET /api/routes` (a GeoJSON FeatureCollection), `GET /api/routes/:id`, `POST`, `PUT`, and `DELETE`.
  - Each feature's properties carry the name, stats, and waypoints.

  *Verify*: controller tests, and `curl` a create and a list.

- [ ] **3.9 Dev seed routes**
  Two or three hand-made routes around Snoqualmie Pass with Z values (for example Snow Lake, or Bandera to Mason Lake), created in `seeds.exs` through the context.
  *Verify*: `mix run priv/repo/seeds.exs`, and `curl /api/routes` returns them.

**Milestone 3**: A working routes API with stats and generated names, testable with curl.

---

## Phase 4: View mode (US1, US4)

- [ ] **4.1 API client and types**
  `api/routes.ts` with typed `listRoutes`, `getRoute`, `createRoute`, `updateRoute`, and `deleteRoute`.
  *Verify*: a Vitest test with mocked `fetch` checks the URLs and parsing.

- [ ] **4.2 Route list in the sidebar** *(UI)*
  The sidebar from 1.3 lists the saved route names above the selection panel, with an empty state when there are none.
  *Verify*: the seeded routes are listed, and selecting a peak still works.

- [ ] **4.3 Select a route and draw only that route** *(UI)*
  - Add `selectedRouteId` to the selection state.
  - `RouteLayer` is passed the selected route and draws **only that route**. With no route selected, no route is drawn.
  - Clicking a route in the list draws it and fits the map to its bounds (`fitBounds` with padding). Clicking another route switches to it.
  - **The route stays drawn while you look at a peak.** Selecting a peak shows the peak panel in the sidebar and leaves the route alone. Closing the peak panel (or clicking empty map) brings back the route's stats.
  - Selecting a route from the list clears any selected peak, so the sidebar shows the route you just chose.

  *Verify*: the Vitest selection tests are extended. On load, no route is drawn. Clicking each seeded route draws only that one and frames it. With a route selected, clicking a peak shows the peak panel and the route stays on the map. Closing the peak panel shows the route's stats again.

- [ ] **4.4 Route stats panel** *(UI)*
  The selected route shows distance (mi), min/max elevation (ft), and gain/loss (ft), using the formatters from 1.1.
  *Verify*: the numbers match the API response after conversion.

**Milestone 4**: US1 and US4 are done. You can browse the seeded routes, and each one is drawn when you select it.

---

## Phase 5: Edit mode with straight lines (US2, no routing yet)

- [ ] **5.1 Mode state and Create route button** *(UI)*
  An app-level `mode: 'view' | 'edit'`. **Create route** enters edit mode, and an edit toolbar shell appears (Save, Cancel, Undo, Redo, Clear, Close loop, all disabled for now). Peak clicks are ignored in edit mode so that map clicks go to the editor.
  *Verify*: you can enter and leave edit mode.

- [ ] **5.2 Editor reducer (pure logic)**
  - The history state is `{ waypoints }` with past and future stacks.
  - Actions: `ADD_POINT`, `UNDO`, `REDO`, `CLEAR`, `CLOSE_LOOP`. `CLEAR` can be undone. `CLOSE_LOOP` needs at least 3 points and appends the first point.
  - Map clicks are ignored while the loop is closed. Undo reopens it.

  *Verify*: thorough Vitest coverage of each action and its edge cases.

- [ ] **5.3 Click to add points** *(UI)*
  In edit mode, a map click dispatches `ADD_POINT`, including a click on a peak. Waypoint markers are drawn, and legs are drawn as dashed straight lines.
  *Verify*: clicking A, B, C draws markers and straight legs, and clicking a peak adds a waypoint rather than selecting it.

- [ ] **5.4 Connect the toolbar** *(UI)*
  Undo, Redo, Clear, and Close loop dispatch their actions, and each button is enabled only when its action is possible.
  *Verify*: go through spec US2 scenarios 2–4 by hand.

**Milestone 5**: You can build straight-line routes with undo, redo, clear, and close loop.

---

## Phase 6: Routing engine (BRouter behind Phoenix)

- [ ] **6.1 BRouter in Docker Compose**
  Add a `brouter` service with volumes for segments and profiles. Choose the image here.
  *Verify*: the container starts and answers HTTP requests.

- [ ] **6.2 Solve segment acquisition** *(the deferred decision)*
  Choose between downloading on demand, downloading the whole world, or a configurable region list, then implement the simplest version that meets FR-011.
  *Verify*: a `curl` straight to BRouter for an A→B pair near Snoqualmie Pass returns a GeoJSON track with elevation.

- [ ] **6.3 Hiking profile**
  Choose the stock profile (e.g. `hiking-mountain`) and adjust it if needed so that trails beat roads.
  *Verify*: for a known pair of points with both a trail and a road between them, the result follows the trail (SC-005).

- [ ] **6.4 `Steer.Routing` behaviour and BRouter adapter**
  `snap(from, to) :: {:ok, [[lon, lat, z]]} | {:error, :no_route | :timeout | term}`. Parse BRouter's GeoJSON and set a timeout that fits the 1-second budget.
  *Verify*: ExUnit tests with a stubbed HTTP client (Req.Test) cover success, no route, and timeout.

- [ ] **6.5 DEM tile fetch and decode**
  - `Steer.Elevation.Tiles` fetches a Terrarium tile and decodes the PNG (choose the library here).
  - Terrarium decoding is `(R*256 + G + B/256) - 32768`.
  - Tiles are cached in memory.

  *Verify*: an ExUnit test with a fixture tile checks a known pixel's elevation.

- [ ] **6.6 Sample elevation along a line**
  `Steer.Elevation.sample_line/1` adds points every ~30 m along the line and fills Z from the tiles.
  *Verify*: an ExUnit test with a fixture tile gives the expected Z at a known point.

- [ ] **6.7 Straight-line fallback (FR-004)**
  `Steer.Routing.snap_or_straight/2` falls back to a straight line with DEM-sampled Z whenever BRouter returns an error, and marks the leg `snapped: false`.
  *Verify*: ExUnit tests for both paths.

- [ ] **6.8 `POST /api/snap` endpoint**
  Takes `{from, to}` and returns a GeoJSON LineString with Z and `properties.snapped`.
  *Verify*: controller tests. A `curl` near Snoqualmie Pass returns a snapped leg, and one in open ocean returns a straight leg.

**Milestone 6**: `/api/snap` returns trail-snapped legs and falls back to straight lines on its own.

---

## Phase 7: Snapping in the editor (US2 complete)

- [ ] **7.1 Snap client**
  `api/snap.ts` with `AbortController` support.
  *Verify*: a Vitest test with mocked `fetch`.

- [ ] **7.2 Leg cache**
  Leg geometry lives outside the undo history, in a map keyed by the from/to coordinates, with a status of `pending | snapped | straight`. Undo and redo reuse cached legs and never request them again.
  *Verify*: Vitest tests for cache hits across undo and redo.

- [ ] **7.3 Optimistic snapping** *(UI)*
  A new leg (including the close-loop leg) draws as a dashed straight line right away, then is swapped for the snapped geometry when the response arrives. Stale requests are aborted when you undo or clear.
  *Verify*: clicking along trails near Snoqualmie Pass (e.g. the PCT toward Kendall Katwalk) shows legs following them in under 1 s (SC-001, checked in devtools).

- [ ] **7.4 Snap failures**
  If `/api/snap` itself fails (Phoenix is down or there's a network error), the leg stays straight with status `straight` and no progress is lost.
  *Verify*: stop Phoenix, click points, and check that the route keeps growing with straight legs.

**Milestone 7**: US2 is done. You can build routes snapped to trails, with a fallback.

---

## Phase 8: Save and exit (US3)

- [ ] **8.1 Save payload builder**
  Turn the editor state and the leg cache into `{name?, waypoints, legs}`.
  *Verify*: Vitest tests.

- [ ] **8.2 Backend fills missing Z**
  During create and update, any leg coordinates without Z (legs that fell back in the client in 7.4) get DEM-sampled Z before the stats are computed.
  *Verify*: an ExUnit test.

- [ ] **8.3 Save dialog** *(UI)*
  Save opens a small dialog with an optional name field. On submit it POSTs, returns to view mode, refreshes the list, and selects the new route. If any legs are still pending, Save waits for them.
  *Verify*: saving without a name gives a stats-based name, and the route appears in the sidebar.

- [ ] **8.4 Dirty tracking and in-app confirm (FR-007)** *(UI)*
  The editor is dirty when its waypoints differ from the state it was opened with. Cancel while dirty shows a confirm dialog.
  *Verify*: Cancel with no changes exits right away. With changes, it asks first.

- [ ] **8.5 `beforeunload` warning**
  Register the handler only while in edit mode with unsaved changes.
  *Verify*: refreshing while dirty shows the browser prompt, and refreshing while clean does not.

- [ ] **8.6 Check that the round trip is identical (SC-004)**
  *Verify*: save a route, reload the page, and check that the geometry and stats are unchanged. Time a full create, name, and save (SC-002, under 2 min).

**Milestone 8**: US3 is done. The core loop works end to end: view, create, snap, save, view.

---

## Phase 9: Edit and delete existing routes (US5, P2)

- [ ] **9.1 Delete** *(UI)*
  A Delete button on the selected route opens a confirm dialog and then sends `DELETE`. The route disappears from the map and the sidebar, and the selection clears.
  *Verify*: after deleting and reloading, the route is still gone.

- [ ] **9.2 Load a route into the editor**
  - Split the stored geometry at each waypoint's `geometry_index` to rebuild the legs.
  - Seed the leg cache with those legs.
  - Start the history at the loaded state, so the editor is not dirty yet.

  *Verify*: a Vitest test for the split. Clicking **Edit** shows the same line with nothing re-requested.

- [ ] **9.3 Save an existing route**
  Saving an edited route uses `PUT` and keeps the existing name, which can be changed in the dialog. A cleared name gets a new generated one.
  *Verify*: extend a saved route, save it, reload, and check the new geometry and stats.

**Milestone 9**: US5 is done, which completes every MVP user story.

---

## Phase 10: Edge cases and acceptance

- [ ] **10.1 Antimeridian**
  Fit bounds and draw legs correctly for routes that cross ±180° (e.g. Fiji or the Aleutians).
  *Verify*: build and save a route that crosses the line, then select it.

- [ ] **10.2 High latitudes**
  Handle clicks near Web Mercator's limit (~85°) gracefully, and check that stats are sensible for routes at high latitude.
  *Verify*: build a route in Svalbard.

- [ ] **10.3 Routing outage**
  *Verify*: with `docker compose stop brouter`, new legs fall back to straight lines, saves work, and no progress is lost.

- [ ] **10.4 Final acceptance pass**
  Go through every acceptance scenario in SPEC.md §1 and every success criterion in §3, and record the results.

**Milestone 10**: The MVP is complete.

---

## Requirement coverage

| Requirement | Chunks |
|---|---|
| FR-001 Map layers; selected saved route in view mode and active route in edit mode | 0.4, 4.3, 5.3, 9.2 |
| FR-002 View and edit modes | 5.1, 9.2 |
| FR-003 Click to add and snap, trails preferred | 5.3, 6.3, 6.4, 7.3 |
| FR-004 Straight-line fallback | 6.7, 7.4 |
| FR-005 Undo, redo, clear, close loop | 5.2, 5.4 |
| FR-006 Save with an optional or generated name | 3.6, 8.3 |
| FR-007 Unsaved-changes warning | 8.4, 8.5 |
| FR-008 Sidebar, fit to route, stats | 1.3, 4.2, 4.3, 4.4 |
| FR-009 Delete | 9.1 |
| FR-010 Imperial units | 1.1 |
| FR-011 Worldwide | 6.2, 10.1, 10.2 |
| FR-012 Routing engine | 6.1–6.4 |
| FR-013 Peak links | 1.2–1.8 |
| SC-001 Leg in under 1 s | 6.4, 7.3 |
| SC-002 Save in under 2 min | 8.6 |
| SC-003 Selected route drawn with no visible delay | 4.3 |
| SC-004 Identical after reload | 8.6 |
| SC-005 Trails before roads | 6.3 |
| SC-006 Peak details render in under 100 ms at p95 and curated links are correct | 1.3, 1.4, 1.7, 1.8 |
| FR-014 Telemetry | 0.7–0.11, 2.5–2.7, plus every feature chunk (see "Telemetry conventions") |
