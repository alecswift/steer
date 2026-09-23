# Route builder

An incremental plan for building hiking routes by clicking on the map, with
the eventual goal of legs that snap to real trails.

## Core model

Two things are kept separate from the start:

- **Waypoints**: the points the user clicked (`[lng, lat][]`). This is the
  only route state the user edits directly.
- **Legs**: the drawn path between each pair of adjacent waypoints. A leg is
  either a straight two-point line or a routed path that follows trails, which
  can have hundreds of coordinates.

The rendered line is derived from waypoints via `buildRouteLine` in
`src/App.tsx`. Today every leg is straight, so it returns the waypoints
unchanged. When snapping arrives, only that derivation (and the leg data it
reads) changes; markers, click handling, undo and dragging do not.

## Snapping approach

Use a routing service rather than routing on the client from vector tiles.

- **BRouter**: free, hiking profiles, self-hostable.
- **GraphHopper**: `hike` profile, free API tier.
- **Valhalla**: `pedestrian` costing.

All use OpenStreetMap data, the same source as the OpenFreeMap base tiles, so
the trail shown on the map is the trail the line snaps to.

Client-side routing from the `trails` layer is not viable for full routing.
Tiles are clipped at their edges and simplified at low zoom, only the visible
area is loaded, and there is no record of how trails connect at junctions.
It is fine for moving a single clicked point onto the nearest trail.

## Design constraints for later steps

1. **Store and cache legs individually.** Moving a waypoint refetches only the
   two legs next to it.
2. **Each leg has a mode: `'snap' | 'straight'`.** Off-trail travel (summits,
   cross-country) is a feature, not just a fallback.
3. **Routing is async: draw straight first.** Show the straight leg
   immediately and replace it when the routed path arrives. On failure the
   straight leg stays.
4. **Distance and elevation are computed from legs, not waypoints**, so they
   measure the real path.

## Steps

- [x] **1. Click to add waypoints.** Map click appends a waypoint, each is
      shown as a marker, and straight legs are drawn through them.
- [ ] **2. Editing.** Undo, clear, and draggable waypoints.
- [ ] **3. Snap waypoints to trails.** Move each clicked point onto the
      nearest trail via `queryRenderedFeatures` on the `trails` layer.
- [ ] **4. Routed legs.** Fetch legs from BRouter or GraphHopper, with per-leg
      caching and the straight-line fallback.
- [ ] **5. Leg modes and stats.** Per-leg snap/straight toggle, then distance
      and elevation gain (elevation via the existing `demSource`).
