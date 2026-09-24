# Feature Specification: Steer (Hiking Route Builder)

**Created**: 2026-09-24
**Status**: Draft
**Scope**: High-level architecture and MVP. Detailed behavior of individual features will be covered in separate feature specs.
**Format**: Based on [GitHub Spec Kit `spec-template.md`](https://github.com/github/spec-kit/blob/main/templates/spec-template.md), with a Technical Context section adapted from its `plan-template.md`.

**Input**: A web app for building and saving hiking routes. **View mode** shows saved routes over a map with toggleable view states. **Edit mode** lets the user build a route by clicking points on the map. Each leg snaps to the most efficient path along existing trails (preferred) or roads. The user can then save and exit easily.

---

## 1. User Scenarios & Testing

### User Story 1 - View the map with toggleable layers (Priority: P1)

The user opens the app and sees a map with their saved routes, topographic contour lines, and hillshade. They can turn each of these three layers on and off.

**Why this priority**: This is the base experience everything else sits on. Most of it already exists in the prototype.

**Independent Test**: Load the app and toggle each layer. The map updates immediately and nothing else changes.

**Acceptance Scenarios**:
1. **Given** the app has just loaded, **When** the map renders, **Then** the routes, topography, and hillshade layers are all visible.
2. **Given** a layer is visible, **When** the user toggles it off, **Then** it disappears from the map and the other layers are unaffected.

---

### User Story 2 - Create a route by clicking points (Priority: P1)

From the initial screen, the user clicks **Create route** to enter edit mode. They click point A, then point B, and the leg between them snaps to the most efficient path, always preferring trails. They keep clicking (C, D, …) to extend the route. They can **Undo**, **Redo**, **Clear** the whole route, or **Close loop** back to the start.

**Why this priority**: Building routes is the core value of the app.

**Independent Test**: Enter edit mode, click several points in an area with known trails, and check that the drawn line follows those trails. Use undo, redo, clear, and close loop, and check that each one gives the expected route.

**Acceptance Scenarios**:
1. **Given** edit mode with one point placed, **When** the user clicks a second point, **Then** a leg snapped to trails or roads appears between them within 1 second.
2. **Given** a route with several points, **When** the user clicks Undo, **Then** the last point and its leg are removed. Redo restores them.
3. **Given** a route with several points, **When** the user clicks Close loop, **Then** a snapped leg from the last point back to the first is added.
4. **Given** a route in progress, **When** the user clicks Clear, **Then** all points and legs are removed.
5. **Given** a leg where no trail or road connects the points, **When** the leg is computed, **Then** it falls back to a straight cross-country line automatically.

---

### User Story 3 - Save and exit edit mode (Priority: P1)

The user saves the route. Entering a name is optional; if they skip it, a name is generated. They then return to view mode. If they try to leave with unsaved changes, they are warned.

**Why this priority**: Routes have to persist, or building them has no value.

**Independent Test**: Build a route, save it without a name, reload the app, and check that the route appears with a generated name.

**Acceptance Scenarios**:
1. **Given** a route in progress, **When** the user saves without entering a name, **Then** the route is stored with an auto-generated name and the app returns to view mode.
2. **Given** unsaved changes, **When** the user tries to leave edit mode, **Then** they are warned before the changes are lost.

---

### User Story 4 - Browse saved routes in the sidebar (Priority: P1)

A sidebar on the right lists saved routes. Clicking a route moves the map to fit it, and the sidebar shows its distance, elevation, and elevation gain and loss.

**Why this priority**: This is how the user finds and reviews their routes.

**Independent Test**: With two or more saved routes, click each one in the sidebar. The map fits the selected route and the stats match it.

**Acceptance Scenarios**:
1. **Given** saved routes exist, **When** the user clicks one in the sidebar, **Then** the map fits that route and the sidebar shows its distance (mi), minimum and maximum elevation (ft), and gain/loss (ft).

---

### User Story 5 - Edit or delete an existing route (Priority: P2)

From a selected route in the sidebar, the user clicks **Edit** to open it in edit mode with the same tools as creating a route, or **Delete** to remove it.

**Why this priority**: Important for keeping routes useful over time, but not needed to prove the core loop.

**Independent Test**: Edit a saved route, extend it, save it, and check the change. Delete a route and check that it is gone from both the map and the sidebar.

**Acceptance Scenarios**:
1. **Given** a selected route, **When** the user clicks Edit, **Then** edit mode opens with that route's points and legs loaded.
2. **Given** a selected route, **When** the user deletes it, **Then** it is removed from storage, the map, and the sidebar.

---

### Edge Cases

- A click lands far from any trail or road: the leg falls back to a straight line (details deferred to a feature spec).
- The routing service is slow or unavailable: the user must not lose route progress.
- Routes can be in any region of the world, including the antimeridian and polar areas where map projections distort.
- A saved route has no name: the generated name must be unique enough to tell routes apart in the sidebar.

---

## 2. Requirements

### Functional Requirements

- **FR-001**: The system MUST display a map with separately toggleable layers for routes, topography (contours), and hillshade, all on by default.
- **FR-002**: The system MUST have a view mode and an edit mode. Users MUST be able to enter edit mode to create a new route or to edit an existing one.
- **FR-003**: In edit mode, users MUST be able to add points by clicking the map. Each leg between consecutive points MUST snap to the most efficient path, preferring trails over roads.
- **FR-004**: When no trail or road path exists between two points, the system MUST fall back to a straight line automatically, without the user doing anything.
- **FR-005**: Users MUST be able to undo, redo, clear the whole route, and close the loop back to the first point. Individual points cannot be deleted directly; undo covers that.
- **FR-006**: Users MUST be able to save a route. Naming it MUST be optional, and unnamed routes MUST get a generated name.
- **FR-007**: The system MUST warn users before they leave edit mode with unsaved changes.
- **FR-008**: The system MUST show saved routes in a right-hand sidebar. Selecting a route MUST fit the map to it and show its distance, elevation, and elevation gain and loss.
- **FR-009**: Users MUST be able to delete saved routes.
- **FR-010**: All measurements MUST be shown in imperial units (miles, feet).
- **FR-011**: The system MUST support routes anywhere in the world.
- **FR-012**: The routing/snapping engine is [NEEDS CLARIFICATION: hosted routing API (e.g. GraphHopper, Valhalla, BRouter) vs. a self-hosted engine (e.g. BRouter, GraphHopper, Valhalla, OSRM, or pgRouting inside Postgres). Must support a hiking profile that prefers trails.]

### Key Entities

- **User**: The owner of routes. The MVP has exactly one implicit user and no login, but every route carries an owner reference so accounts can be added later without migrating data.
- **Route**: Name (optional or generated), owner, ordered waypoints, the resolved snapped geometry (a line with elevation), computed stats (distance, min/max elevation, gain, loss), and timestamps.
- **Waypoint**: One user-clicked point (longitude, latitude) in a route's ordered list. The waypoints are kept so a route can be re-snapped and edited.
- **User Settings** *(future)*: Saved preferences such as default layer visibility.

---

## 3. Success Criteria

### Measurable Outcomes

- **SC-001**: After the user clicks a new point, the snapped leg appears in under 1 second.
- **SC-002**: The user can create, name, and save a multi-point route in under 2 minutes without instructions.
- **SC-003**: Toggling a layer updates the map with no visible delay.
- **SC-004**: A saved route reloads with identical geometry and stats after a page refresh.
- **SC-005**: For any route that has at least one trail option, the snapped path follows trails and uses roads only where no trail connects.

---

## 4. Assumptions

- **Single user for the MVP**: no authentication. The data model and API are designed so multi-user accounts can be added later.
- **Desktop browser first**: the layout should not rule out phones and tablets, which are planned for later.
- **Map data**: base map tiles come from OpenFreeMap (OSM-based vector tiles, no API key). Elevation comes from AWS Terrain Tiles (Terrarium encoding), which also feed hillshade, contours, and route elevation stats.
- **Main use is hiking**: routing always prefers trails.
- The map opens on a fixed default view (currently Mt. Rainier).
- Hosting and deployment are not decided yet.

### Out of Scope (MVP)

- Detailed rules for cross-country fallback (distance thresholds, styling straight legs differently)
- Elevation profile chart and live stats while editing
- Dragging or directly deleting individual waypoints
- GPX import and export
- Saved user settings (remembered layer toggles)
- User accounts and multi-user support
- Mobile and tablet layouts
- Snapping to terrain features such as ridgelines (stretch idea: find ridges from the elevation data)

---

## 5. Technical Context

| Area | Choice |
|---|---|
| **Frontend** | TypeScript, React 19, Vite |
| **Map rendering** | MapLibre GL via `react-map-gl`, contours via `maplibre-contour` |
| **Backend** | Elixir, Phoenix (JSON API) |
| **Database** | PostgreSQL + PostGIS, accessed through Ecto with `geo_postgis` |
| **Routing engine** | Open. See FR-012 |
| **Hosting** | To be decided |

### Architecture Overview

```mermaid
flowchart LR
    subgraph Client["Browser: React + MapLibre"]
        UI["View / Edit modes<br/>Layer toggles<br/>Right sidebar"]
    end

    subgraph Backend["Elixir / Phoenix"]
        API["JSON API<br/>Routes CRUD<br/>Stats computation"]
    end

    DB[("PostgreSQL + PostGIS")]
    Tiles["OpenFreeMap<br/>(base map, trails)"]
    DEM["AWS Terrain Tiles<br/>(elevation)"]
    Router["Routing engine<br/>(TBD, FR-012)"]

    UI -- "JSON / GeoJSON" --> API
    API -- "Ecto + geo_postgis" --> DB
    UI -- "vector tiles" --> Tiles
    UI -- "DEM tiles" --> DEM
    UI -. "snap leg A → B" .-> Router
```

> Whether the client calls the routing engine directly or goes through the Phoenix API depends on the engine choice (FR-012).

### Technical Notes

- **Storage**: each route stores its ordered waypoints (for editing and re-snapping) and its resolved geometry as a PostGIS `LineStringZ` (for display and stats). The API returns GeoJSON that MapLibre can use directly.
- **Stats**: distance is computed with PostGIS geography functions (`ST_Length`). Elevation gain and loss come from the Z values sampled from the DEM along the resolved line.
- **Undo/redo** is client-side state in edit mode. Only the saved route is sent to the backend.
- **Performance**: SC-001's sub-second target means per-leg routing requests must be fast. This limits the routing engine choice (FR-012).
