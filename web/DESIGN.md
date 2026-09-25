# Steer design direction

Steer is a map-first hiking route builder for one person planning trips in the Cascades. The map is the product; the interface around it should feel like well-made trail signage: plain, legible, and sure of itself. Every *(UI)* chunk builds on this file and on the tokens in [`src/styles/tokens.css`](src/styles/tokens.css).

## Principles

- **The map leads.** UI never competes with the terrain. Panels are calm, flat colour fields; the only strong colours on screen are the route and the trails.
- **One bold element: route stats.** Distance, elevation and gain/loss are set large and heavy (`--text-3xl`, `--weight-heavy`) like the numbers on a trailhead sign. Everything else stays quiet.
- **Numbers line up.** Body text uses tabular figures, so stats in lists and panels align without a monospace face.
- **Structure means something.** Borders, dividers and numbering only where they carry information (a list of routes is a list; a route's points are a sequence). No decorative eyebrows or labels.

## Layout concept

The map fills the window. The sidebar sits on the right (FR-008), flush to the edge with no radius, on `--color-bg`. Content is left-aligned.

```
┌──────────────────────────────────────────┬──────────────┐
│                                          │ Routes       │
│                                          │  Kendall loop│ ← selected row: --color-surface
│                 map                      │  Guye Peak   │
│          (route + trails +               ├──────────────┤
│           contours + hillshade)          │ 5.2 mi       │ ← route stats, heavy
│                                          │ +2,340 ft    │
│                                          │ [Edit] [Del] │
└──────────────────────────────────────────┴──────────────┘
```

Edit-mode tools float over the map on `--color-raised` with `--radius-lg` and `--shadow-2`.

## Colour

The light theme is the base palette ([colorhunt f3c892-fff1bd-a3da8d-146356](https://colorhunt.co/palette/f3c892fff1bda3da8d146356)). Dark values are derived from it: the teal darkened for backgrounds, cream for text, sage as the primary. Contrast ratios are WCAG 2.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FFF1BD` | `#0C2B26` | Sidebar and page background |
| `--color-surface` | `#F3C892` | `#133A33` | Selected or hovered rows, secondary panels |
| `--color-raised` | `#FFF8DC` | `#1C4A41` | Inputs, dialogs, floating toolbars |
| `--color-text` | `#146356` (6.3 on bg) | `#FFF1BD` (13.4 on bg) | Body text |
| `--color-text-muted` | `#4A6B5E` (5.2) | `#B8C4A8` (8.3) | Secondary text |
| `--color-primary` / `--color-on-primary` | `#146356` / `#FFF1BD` | `#A3DA8D` / `#0C2B26` | Primary buttons |
| `--color-accent` / `--color-on-accent` | `#A3DA8D` / `#146356` | `#F3C892` / `#0C2B26` | Chips, highlights |
| `--color-danger` | `#A8322A` (5.9) | `#FF9C8A` (7.5) | Delete, errors |
| `--color-focus` | `#146356` | `#A3DA8D` | Keyboard focus ring |

Rules:
- Teal on sage is 4.4:1, just under AA for body text. Put only bold or large text on `--color-accent` in light mode.
- Danger red on tan is 4.3:1. Keep danger text on `--color-bg` or `--color-raised`.

### Map colours

MapLibre can't read CSS variables, so map colours live in [`src/styles/tokens.ts`](src/styles/tokens.ts) and are mirrored in `tokens.css` as `--map-*`. `tokens.test.ts` fails if they drift. They're the same in both themes, because the base map is always light.

| Token | Value | Why |
|---|---|---|
| `route` | `#E6532C` | Strong, redder orange. Tested against a blaze orange (`#FF5F15`), which looked too close to the base map's orange I-90. |
| `trail` | `#7B1FA2` | Purple reads clearly on green terrain and never looks like a road. |
| `contourLine` | `rgba(120, 80, 40, 0.6)` | Classic brown contours. |
| `contourLabel` / `contourLabelHalo` | `#5C3D1F` / `#FFF1BD` | Halo uses the palette's cream. |

These map colours sit outside the UI palette on purpose: palette greens and tans would disappear into the forest and land colours of the base map.

## Type

**Overpass** (`@fontsource-variable/overpass`), a revival of Highway Gothic, the US road-sign face. One family for everything, weights 400 / 600 / 800.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 12px | Map attributions, fine print |
| `--text-sm` | 14px | Secondary text, list metadata |
| `--text-md` | 16px | Body |
| `--text-lg` | 18px | Panel titles |
| `--text-xl` | 21px | Peak and route names |
| `--text-2xl` | 24px | Dialog titles |
| `--text-3xl` | 36px | Route stats |

Line height is `--leading-body` (1.45) for text and `--leading-tight` (1.15) for headings and stats. Keep lines under 80 characters.

## Space, radii, shadows

- **Spacing** is a 4px scale, `--space-1` (4px) to `--space-7` (48px).
- **Radii** are sized by role, not one value everywhere: `--radius-sm` 3px for chips and inputs, `--radius-md` 6px for buttons, `--radius-lg` 10px for dialogs and floating panels. The sidebar has none.
- **Shadows** are tinted teal in light mode, not grey. `--shadow-1` for small raised controls, `--shadow-2` for floating panels and dialogs.

## Avoid

- All-caps labels, and labels above content that don't add information.
- Highlighting a single word in a heading with a different weight or colour.
- Monospace for numbers (use the tabular figures instead).
- `→` appended to buttons and links.
- Scattered entrance animations. Motion only answers an action, like a panel opening or a leg snapping into place, and respects `prefers-reduced-motion`.

## Writing

Name things by what the hiker does: **Create route**, **Save route**, **Close loop**. An action keeps its name through the flow: the **Save route** button produces "Route saved". Errors say what happened and what to do next, without apologising. Empty states invite action ("No routes yet. Create one to see it here.").
