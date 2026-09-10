# Globe audit (research-globe)

Date: 2026-09-10  
File: `frontend/app/Components/3d/EarthGlobe.tsx`

## Library

Custom Three.js globe (`OrbitControls`), not Cesium. Cities: hardcoded `SEARCHABLE_LOCATIONS`.

## Capabilities

| Capability | Status |
|------------|--------|
| Idle rotation | Yes — `autoRotate` when not expanded |
| Orbit / zoom | Yes — min 3.8 / max 14.5 |
| Hub markers | Yes |
| Search + click fly-to | Yes — generation-based `flyToCity` (interruptible) |
| Imperative fly-to | Yes — `EarthGlobeHandle` (`flyToName`, `flyToPlace`, `expand`) |
| Live stream markers | Yes — `sourceMarkers` on research NDJSON `tool_call` / `tool_result` / `context_fetch` |
| Send location to chat | Yes — selected hub **Send to chat** |
| Research globe button | Yes — header **Globe** |
| Auto-save dashboard | No — preview + explicit **Add to dashboard** only |

## Fly-to notes

Disable autoRotate + damping while flying; skip expand-distance lerp while `isFlyingRef`; new fly increments `flyGenRef` so overlapping tweens cancel.
