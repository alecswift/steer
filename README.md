# Steer

## About

Steer is an early hiking map prototype displaying trails, topographic contour lines, hillshade, and a placeholder route.

## Repo layout

| Path | What it is |
|---|---|
| `web/` | The frontend: React + TypeScript + Vite, with MapLibre for the map. |
| `docker-compose.yml` | Local services: PostGIS (`db`), the BRouter routing engine (`brouter`) and the telemetry stack (`telemetry`). |
| `brouter/` | The script that downloads BRouter's segment files. |
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

From a clean checkout, run this from the repo root:

```sh
docker compose up -d
```

It starts everything: PostGIS (`db`), BRouter (`brouter`), the telemetry stack (`telemetry`), the Phoenix API (`server`, on `localhost:4000`) and the Vite dev server (`web`). Then open the app at [localhost:3000](http://localhost:3000).

- **First start** takes a few minutes: Compose builds BRouter, and the `server` and `web` containers install their dependencies. Follow along with `docker compose logs -f server web`.
- **Code changes** apply without a restart. The source folders are mounted into the containers: Vite hot-reloads the frontend, and Phoenix recompiles on the next request.
- **New dependencies** are installed when the container starts, so after changing `package.json` or `mix.exs`, run `docker compose restart web` or `docker compose restart server`.
- **Snapping** needs BRouter's segment files, which are downloaded separately (see [Routing](#routing)).

To stop everything, run `docker compose stop`. The database and telemetry data are kept in Docker volumes, so they're still there when you start again.

### Running Phoenix or Vite natively

You can run either app outside Docker instead, for example to use `iex`. Stop its container first so the port is free, then start it yourself, each in its own terminal from the repo root:

```sh
docker compose stop server web
cd server && mix setup && mix phx.server   # the API on localhost:4000
cd web && npm install && npm run dev       # the app on localhost:3000
```

Run natively, Vite opens the app in your browser itself, and it fails instead of picking another port if 3000 is taken.

## Frontend commands

Run these from `web/`:

```sh
npm run dev      # start the dev server
npm run build    # type-check and build
npm run lint     # run oxlint (CI runs this on every PR)
npm test         # run the Vitest tests
npm run peak-links [summitpost|peakbagger|wta]   # regenerate the peak link indexes (one-time; SummitPost takes hours)
```

How the peak link indexes are made, and how to add another state: [web/scripts/PEAK_LINKS.md](web/scripts/PEAK_LINKS.md).

## Database

The `db` service runs PostGIS on `localhost:5432`, with user `postgres` and password `postgres`. These are dev-only credentials. To open a SQL shell:

```sh
docker compose exec db psql -U postgres
```

The Phoenix backend stores saved routes here, in the `steer_dev` database. The `server` container creates, migrates and seeds it on start.

## Routing

The `brouter` service runs [BRouter](https://github.com/abrensch/brouter) on `localhost:17777`. Only the Phoenix backend calls it; the frontend asks Phoenix for snapped legs. Compose builds it from the upstream v1.7.10 release (no published image is new enough), so the first `docker compose up` takes a few minutes. BRouter reads its routing data (segment files) from the `brouter-segments` Docker volume, which starts out empty, so until segments are added every request answers `datafile ... not found`. To download them (the whole world, about 10 GB, once per machine):

```sh
docker compose run --rm brouter-segments
```

The download skips files that are already there, so rerunning it resumes an interrupted download. The segments are rebuilt from OpenStreetMap daily; to refresh them, remove the volume (`docker compose down` then `docker volume rm steer_brouter-segments`) and download again.

After the download finishes, start BRouter from the repo root:

```sh
docker compose up -d brouter
```

## Telemetry

The browser sends traces, logs, errors, product events and metrics with OpenTelemetry. In dev, they go through the Vite proxy at `/otlp` to the `telemetry` container, which runs an OpenTelemetry collector, Loki (logs), Tempo (traces), Prometheus (metrics) and Grafana.

- **Steer dashboard**: [localhost:3001/d/steer/steer](http://localhost:3001/d/steer/steer). It refreshes every 10 seconds. No login is needed.
- **Raw data**: open **Explore** in Grafana and pick **Tempo** (traces), **Loki** (logs and events) or **Prometheus** (metrics).
- **Editing the dashboard**: change `telemetry/grafana/dashboards/steer.json`, not the Grafana UI. Grafana reloads the file within 10 seconds.

If the telemetry stack isn't running, the app still works; the data is dropped.
