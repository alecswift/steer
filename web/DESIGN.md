# Steer design direction

Steer is a map-first hiking route builder for one person planning trips in the Cascades. The map is the product; the interface around it is a panel floating over it: calm and legible, so the topo map stays in front. It follows the OS theme: a warm off-white **field-guide** panel in light mode, and a **dark instrument panel** in dark mode. Every *(UI)* chunk builds on this file and on the tokens in [`src/styles/tokens.css`](src/styles/tokens.css).

## Principles

- **The map leads.** UI never competes with the terrain. Panels are quiet fields floating over the map; the only strong colours on screen are the route, the trails and the one UI accent.
- **One accent.** `--color-primary` (teal in light mode, sage in dark) marks what you can act on or what's selected: link icons, the peak mark, focus rings. Text is never accent-coloured.
- **One large figure per panel.** A peak's elevation, or a route's distance, elevation and gain/loss, is set large and heavy (`--text-3xl`, `--weight-heavy`) with its unit small and muted, like the numbers on a summit register. Everything else steps down: the name, then muted details.
- **Numbers line up.** Body text uses tabular figures, so stats in lists and panels align without a monospace face.
- **Structure means something.** Borders, dividers and numbering only where they carry information (a list of routes is a list; a route's points are a sequence). No decorative eyebrows or labels.

## Layout concept

The map fills the window. The sidebar (FR-008) is a card floating over its top-right corner, 16px in from the edges, on `--color-bg-translucent` with a background blur, `--radius-xl` and `--shadow-2`. It grows with its content up to the window's height. On narrow screens it becomes a sheet along the bottom. The map's default view is framed in the space beside it, and the attribution sits bottom-left, clear of it. Content is left-aligned.

```
┌─────────────────────────────────────────────────────────┐
│                                   ┌──────────────────┐  │
│                                   │ ▲ Kendall Peak  ✕│  │ ← name, peak mark in accent
│                                   │ 5,781 ft         │  │ ← the one large figure
│             map                   │ 47.44° N, …      │  │ ← muted
│    (route + trails +              │ ──────────────── │  │
│     contours + hillshade)         │ ⛰ SummitPost   ↗ │  │ ← site icon (accent), kind icon
│                                   │ ⛰ Peakbagger   ↗ │  │
│                                   └──────────────────┘  │
│ ⓘ OpenFreeMap © …                                       │
└─────────────────────────────────────────────────────────┘
```

Edit-mode tools float over the map the same way, on `--color-raised` with `--radius-lg` and `--shadow-2`.

## Colour

Two themes, following the OS (`color-scheme: light dark`). The map is always light. Contrast ratios are WCAG 2, measured on `--color-bg` / `--color-surface` / `--color-raised`; all pass AA.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FBF9F4` | `#111B18` | Panel background (`--color-bg-translucent` is it at 90%, for floating panels) |
| `--color-surface` | `#F0ECE2` | `#1B2824` | Hovered or selected rows, hike cards |
| `--color-raised` | `#FFFFFF` | `#22322D` | Inputs, dialogs, floating toolbars, hovered cards |
| `--color-text` | `#1E2A26` (14.1 / 12.6 / 14.8) | `#EEF1EA` (15.4 / 13.4 / 11.8) | Body text |
| `--color-text-muted` | `#5B6863` (5.5 / 4.9 / 5.8) | `#9FADA5` (7.5 / 6.5 / 5.8) | Secondary text, units, icons at rest |
| `--color-primary` / `--color-on-primary` | `#146356` (6.8 / 6.0 / 7.1) / `#FBF9F4` | `#A3DA8D` (10.9 / 9.4 / 8.3) / `#111B18` | The one accent: icons you can act on, the peak mark, primary buttons |
| `--color-accent` / `--color-on-accent` | `#A3DA8D` / `#146356` | `#F3C892` / `#111B18` | Chips, highlights |
| `--color-danger` | `#A8322A` (6.3 / 5.6 / 6.7) | `#FF9C8A` (8.7 / 7.5 / 6.6) | Delete, errors |
| `--color-focus` | `#146356` | `#A3DA8D` | Keyboard focus ring |
| `--color-border` | `rgba(30, 42, 38, 0.12)` | `rgba(238, 241, 234, 0.1)` | Panel edge, dividers, card edges |

Rules:
- The accent changes hue between themes because sage on the light panel is only 1.5:1, too faint even for icons.
- Teal on sage (`--color-on-accent` on `--color-accent`, light) is 4.4:1, just under AA for body text. Put only bold or large text on it.

### Map colours

MapLibre can't read CSS variables, so map colours live in [`src/styles/tokens.ts`](src/styles/tokens.ts) and are mirrored in `tokens.css` as `--map-*`. `tokens.test.ts` fails if they drift. The base map is always light, so they don't change with the UI.

| Token | Value | Why |
|---|---|---|
| `route` | `#E6532C` | Strong, redder orange. Tested against a blaze orange (`#FF5F15`), which looked too close to the base map's orange I-90. |
| `trail` | `#7B1FA2` | Purple reads clearly on green terrain and never looks like a road. |
| `contourLine` | `rgba(120, 80, 40, 0.6)` | Classic brown contours. |
| `contourLabel` / `contourLabelHalo` | `#5C3D1F` / `#FFF1BD` | Halo uses the palette's cream. |
| `peak` / `peakHalo` | `#3A2614` / `#FFF1BD` | Peak triangle and name. A darker ink than the contour labels, so summits read above the contour lines without adding a new hue. |

These map colours sit outside the UI palette on purpose: palette greens and tans would disappear into the forest and land colours of the base map.

## Type

**Public Sans** (`@fontsource-variable/public-sans`), from the US Web Design System: a clean, civic grotesque, still in the family of public signage but tighter and more current than a Highway Gothic revival. One family for everything, weights 400 / 600 / 800, with tabular figures.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 12px | Map attributions, fine print |
| `--text-sm` | 14px | Secondary text, list metadata |
| `--text-md` | 16px | Body |
| `--text-lg` | 18px | Panel titles |
| `--text-xl` | 21px | Peak and route names (semibold) |
| `--text-2xl` | 24px | Dialog titles |
| `--text-3xl` | 36px | The panel's one large figure: peak elevation, route stats |

Line height is `--leading-body` (1.45) for text and `--leading-tight` (1.15) for headings and stats. Keep lines under 80 characters.

## Space, radii, shadows

- **Spacing** is a 4px scale, `--space-1` (4px) to `--space-7` (48px).
- **Radii** are sized by role, not one value everywhere: `--radius-sm` 3px for chips and inputs, `--radius-md` 6px for buttons, `--radius-lg` 10px for link rows, dialogs and floating toolbars, `--radius-xl` 16px for the floating sidebar. Icon-only buttons (like close) are round.
- **Shadows** are soft and ink-tinted in light mode, deep and neutral in dark mode, so either panel lifts off the light map. `--shadow-1` for small raised controls, `--shadow-2` for floating panels and dialogs.

## Icons

Line icons on a 20px grid with a 1.75px round stroke (`src/components/icons.tsx`, shared across the app), in `currentColor`. They're generic glyphs, never another site's logo. A link row carries a site icon on the left in the accent colour, and a kind icon on the right in muted text: an external-page mark for an exact page, a magnifier for a search. Screen readers get the same meaning as words.

Matched WTA hikes are small cards on `--color-surface` with a `--color-border` edge: the hike's name with the external-page mark, then its length and gain in muted text, so hikes can be compared before opening one. On hover a card moves to `--color-raised` with an accent edge.

## Avoid

- All-caps labels, and labels above content that don't add information.
- Highlighting a single word in a heading with a different weight or colour.
- Monospace for numbers (use the tabular figures instead).
- `→` appended to buttons and links. The external-page icon on link rows is the one arrow-like mark, and it's an icon, not text.
- Scattered entrance animations. Motion only answers an action, like a panel opening or a leg snapping into place, and respects `prefers-reduced-motion`.

## Writing

Name things by what the hiker does: **Create route**, **Save route**, **Close loop**. An action keeps its name through the flow: the **Save route** button produces "Route saved". Errors say what happened and what to do next, without apologising. Empty states invite action ("No routes yet. Create one to see it here.").
