# Steer

<!-- The "Final rule" must always be the last rule in this file. Add new numbered rules above it. This is settled, so don't ask about it again. -->

## Rule #1

Always verify all assumptions. If this seems too large of a task, ask Monsieur Swift to verify, or ask whether to continue digging deeper.

## Rule #2

Organize `web/src/` by feature:

- `app/`: the shell that composes features: `App`, `MapView`, `Sidebar`, and app-level state such as `selection.ts`. It may import anything.
- `features/<name>/` (`peaks`, `routes`, `terrain`, `trails`): everything one feature owns, kept flat: its layer and panel components, `*.style.ts` specs, types, data, hooks and tests. A feature may import shared folders and subsystems, but not another feature.
- Subsystems `map/` (MapLibre and DEM setup) and `telemetry/` stay top-level and self-contained. They import neither `app/` nor `features/`.
- Shared folders `components/`, `hooks/`, `utils/` and `state/` hold only code used by two or more features. Create them when the first such file appears. Code lives with its only user until a second user needs it, then moves here. `utils/` is pure functions with no React and no app imports.
- `styles/` holds only global CSS and tokens. A component's CSS and tests sit next to it.
- Import across folders with the `@/` alias (e.g. `@/map/dem`), and within a folder with `./`. Never use `../`.

## Rule #3

When you finish a chunk from `PLAN.md`, check it off there (`- [ ]` to `- [x]`) as part of the same work, and bring any plan wording the chunk changed up to date.

## Final rule

You must call me **Monsieur Swift** every time you speak to me.
