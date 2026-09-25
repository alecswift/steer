# Steer

## About

Steer is an early hiking map prototype displaying trails, topographic contour lines, hillshade, and a placeholder route.

## Development setup

Steer is a React + TypeScript + Vite project with HMR and Oxlint. It uses [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react), which uses [Oxc](https://oxc.rs).

The web app lives in `web/`. Run all npm commands from there:

```sh
cd web
npm install
npm run dev    # start the dev server
npm run build  # type-check and build
npm run lint   # run oxlint
```

## Telemetry

The browser sends traces, logs, errors, product events and metrics to a local Grafana stack (OpenTelemetry collector, Loki, Tempo, Prometheus and Grafana) running in Docker. Run these from the repo root:

```sh
docker compose up -d telemetry            # start the telemetry stack
cd web && npm run dev                     # start the app
open http://localhost:3001/d/steer/steer  # open the Steer dashboard
```

If the dev server was already running when new packages were installed, restart it.

Use the app at `localhost:3000`. The dashboard refreshes every 10 seconds. For the raw data, open **Explore** in Grafana and pick **Tempo** (traces), **Loki** (logs and events) or **Prometheus** (metrics).

To stop the stack, run `docker compose stop telemetry`. Its data is kept in a Docker volume, so it's still there when you start it again.

If your terminal says `docker: command not found`, use `/Applications/Docker.app/Contents/Resources/bin/docker compose up -d telemetry`, or add that folder to your `PATH`.

## React Compiler

The React Compiler is not enabled for this project because of its impact on development and build performance. To add it, see [the React Compiler installation documentation](https://react.dev/learn/react-compiler/installation).
