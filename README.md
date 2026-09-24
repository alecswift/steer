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

## React Compiler

The React Compiler is not enabled for this project because of its impact on development and build performance. To add it, see [the React Compiler installation documentation](https://react.dev/learn/react-compiler/installation).
