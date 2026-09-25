# Steer

## About

Steer is an early hiking map prototype displaying trails, topographic contour lines, hillshade, and a placeholder route.

## Repo layout

| Path | What it is |
|---|---|
| `web/` | The frontend: React + TypeScript + Vite, with MapLibre for the map. |
| `docker-compose.yml` | Local services: PostGIS (`db`) and the telemetry stack (`telemetry`). |
| `telemetry/grafana/` | The Steer Grafana dashboard and its provisioning file. |
| `SPEC.md`, `PLAN.md` | What Steer does, and the order it's being built in. |
| `web/DESIGN.md` | The visual direction and design tokens for the UI. |

## Prerequisites

- **Node 24** (CI uses the same version)
- **Docker Desktop**, with Docker Compose

On macOS, if Docker Desktop is installed but your terminal says `docker: command not found`, add its CLI folder to your `PATH`:

```sh
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
```

## Getting started

From a clean checkout, run these from the repo root:

```sh
docker compose up -d db telemetry   # start PostGIS and the telemetry stack
cd web
npm install
npm run dev                         # start the app on localhost:3000
```

The dev server opens the app in your browser at [localhost:3000](http://localhost:3000). It fails instead of picking another port if 3000 is taken. If new packages were installed while it was running, restart it.

To stop the services, run `docker compose stop`. Their data is kept in Docker volumes, so it's still there when you start them again.

## Frontend commands

Run these from `web/`:

```sh
npm run dev      # start the dev server
npm run build    # type-check and build
npm run lint     # run oxlint (CI runs this on every PR)
npm test         # run the Vitest tests
```

## Database

The `db` service runs PostGIS on `localhost:5432`, with user `postgres` and password `postgres`. These are dev-only credentials. To open a SQL shell:

```sh
docker compose exec db psql -U postgres
```

Nothing uses the database yet; the Phoenix backend arrives in Phase 2 of the plan.

## Telemetry

The browser sends traces, logs, errors, product events and metrics with OpenTelemetry. In dev, they go through the Vite proxy at `/otlp` to the `telemetry` container, which runs an OpenTelemetry collector, Loki (logs), Tempo (traces), Prometheus (metrics) and Grafana.

- **Steer dashboard**: [localhost:3001/d/steer/steer](http://localhost:3001/d/steer/steer). It refreshes every 10 seconds. No login is needed.
- **Raw data**: open **Explore** in Grafana and pick **Tempo** (traces), **Loki** (logs and events) or **Prometheus** (metrics).
- **Editing the dashboard**: change `telemetry/grafana/dashboards/steer.json`, not the Grafana UI. Grafana reloads the file within 10 seconds.

If the telemetry stack isn't running, the app still works; the data is dropped.
