# Globe audit (prerequisite to research-globe feature)

Date: 2026-09-10  
File: `frontend/app/Components/3d/EarthGlobe.tsx`

## Library

Not Cesium, Mapbox, or `react-globe.gl`. It is a **custom Three.js** globe:

- `three` sphere + canvas-painted Natural Earth polygons (`landmassData`)
- `OrbitControls` from `three/examples/jsm/controls/OrbitControls.js`
- No third-party geocoder; cities are a hardcoded `SEARCHABLE_LOCATIONS` list

## What it can do today

| Capability | Status |
|------------|--------|
| Idle rotation | Yes — `autoRotate` when **not** expanded |
| Orbit / zoom | Yes — OrbitControls, min 3.8 / max 14.5 |
| Markers | Yes — major hubs as meshes on `earthGroup` |
| Search + click fly-to | Yes — `flyToCity` |
| Raycast hub click | Yes — major hubs only |
| Agent-driven fly-to | **No** — no imperative API, Research page does not pass coordinates |
| Live stream markers | **No** |
| Send location to chat | **No** |

## Why fly-to felt broken

1. **OrbitControls vs camera animation.** Fly-to writes `camera.position` and `lookAt(0,0,0)` while the render loop still called `controls.update()` unless `isFlyingRef` was set. Damping + autoRotate fought the animation. Expanding the globe also called `controls.update()` and **lerped camera distance**, which interrupts an in-flight tween.
2. **Stuck lock.** `if (isFlyingRef.current) return` dropped later fly-to clicks if a previous animation never cleared the flag (unmount / overlap).
3. **Coordinate system is consistent** (not the main bug). `latLonToVector3` matches marker placement and the painted texture (`lon+180` / `90-lat`). Fly-to uses the same helper, so Mumbai is not in a different CRS than the pins.
4. **No external trigger.** Even a perfect fly-to cannot run from chat until Research exposes `flyToCity` (imperative handle) and the agent emits a location.

## Fix applied in this pass

- Disable autoRotate + damping for the duration of fly-to
- Skip the `isExpanded` camera lerp while flying
- Re-enable controls only after the camera is on the target

## Do not build yet

Live streaming markers and “send to chat” wait until this fly-to is verified in the browser on `/research` (search Mumbai, confirm the camera settles on the pin).
