# Plan: Fix Arc Processing in NestingAX

## Objective
Fix the display, geometry generation, and nesting boundaries for Arc entities within the NestingAX tool. The primary symptoms are arcs rendering incorrectly (as full circles, "C" shapes, or inverted) when imported from DXF, drawn, or transformed, and failing to nest properly.

## Scope
- **IN SCOPE:**
  - `components/NestingAX/services/dxfService.ts` (DXF parsing & Export)
  - `components/NestingAX/Workspace.tsx` (Canvas Rendering & Interactions)
  - `components/nesting/NewNestList/VectorPreview.tsx` (Part Preview rendering)
  - `components/NestingAX/services/nesting.ts` (Geometry extraction for nesting)
- **OUT OF SCOPE:**
  - `services/nesting/` (Legacy nesting engine)
  - `components/nesting/` (Legacy drawing tools, except `VectorPreview.tsx`)
  - GCode 3D Viewer arc rendering

## Key Decisions & Conventions
- **Angle Unit Convention:** All `startAngle` and `endAngle` values in `CadEntity.properties` MUST be stored in **Degrees [0, 360)**.
- **Single Source of Truth:** `Workspace.tsx` currently relies on the 3 `points` (Start, Mid, End) to draw arcs dynamically. However, `VectorPreview.tsx` and `nesting.ts` rely on `properties.startAngle` and `properties.endAngle`. We will ensure both are kept in sync, but angle properties must be correctly normalized.
- **Normalization Utility:** We will introduce a standard helper to normalize angles to `[0, 360)` degrees to prevent `Math.atan2` wrap-around bugs.

## Technical Approach & Identified Bugs

1. **Bug A (DXF Parsing Midpoint):** `dxfService.ts` calculates the mid-angle incorrectly if the arc crosses 0°.
2. **Bug B & C (DXF Angle Storage):** `dxfService.ts` converts radians to degrees but fails to normalize negative angles.
3. **Bug D (Ghost SVG Preview):** `Workspace.tsx` hardcodes `sweepFlag=1` and `largeArcFlag=0` for the ghost arc, making >180° arcs or CW arcs display wrong during dragging.
4. **Bug E (Nesting Engine Field Mismatch):** `nesting.ts` (`entitiesToPolygon`) looks for `e.center`, `e.startAngle`, `e.endAngle` at the top level of the entity, but they are stored in `e.properties`. This causes `undefined` fallbacks resulting in full circles at (0,0).
5. **Bug F & G (Drawing Arcs):** Fillet tools generate negative angles. 3-point arcs don't even save angle properties.
6. **Bug H (Transformations):** Rotating or mirroring an arc in the workspace updates the 3 points but leaves `properties.startAngle/endAngle` stale.

## Implementation Steps

### Step 1: Angle Normalization Utility
- Add a helper function in `components/NestingAX/services/dxfService.ts` (or a shared utils file) to safely convert `atan2` outputs to `[0, 360)` degrees.
- `const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;`

### Step 2: Fix DXF Import (`dxfService.ts`)
- In `parseDXF` -> `case 'ARC'`, read `startAngle` and `endAngle` (which are in radians).
- Calculate `angleDiff = endAngle - startAngle; if (angleDiff < 0) angleDiff += 2*PI;`.
- Calculate `midAngle = startAngle + angleDiff / 2`.
- Store properties: `startAngle: normalizeDeg(sa * 180 / Math.PI)`, `endAngle: normalizeDeg(ea * 180 / Math.PI)`.

### Step 3: Fix DXF Export (`dxfService.ts`)
- In `exportToDXF` -> `case 'arc'`, correctly calculate `sa` and `ea` from the 3 points using `Math.atan2`, convert to degrees, and apply `normalizeDeg`.

### Step 4: Fix Nesting Engine Polygon Generation (`nesting.ts`)
- In `entitiesToPolygon` -> `else if (e.type === 'arc')`, change the lookups to use `e.properties`:
  - `const cx = e.properties?.centerX ?? 0;`
  - `const cy = e.properties?.centerY ?? 0;`
  - `const r = e.properties?.radius ?? 0;`
  - `const start = e.properties?.startAngle ?? 0;`
  - `const end = e.properties?.endAngle ?? 360;`

### Step 5: Fix VectorPreview (`VectorPreview.tsx`)
- Update `case 'arc'`:
  - `const startAngle = (entity.properties?.startAngle ?? 0) * (Math.PI / 180);`
  - `const endAngle = (entity.properties?.endAngle ?? 360) * (Math.PI / 180);`
  - Fix the sweep calculation: `let sweep = endAngle - startAngle; if (sweep < 0) sweep += 2 * Math.PI; if (sweep === 0) sweep = 2 * Math.PI;`
  - Ensure points are generated along the CCW path correctly.

### Step 6: Fix Workspace Ghost Arc & Properties Sync (`Workspace.tsx`)
- In `ghostSvg` (around line 4376), dynamically calculate `largeArcFlag` and `sweepFlag` exactly as done in the main arc renderer (line 3480-3493) instead of hardcoding `0 0 1`.
- Update `entitiesToSave` (around line 1236) to recalculate and inject fresh `centerX, centerY, radius, startAngle, endAngle` into `properties` based on the 3 points of the polyline/arc, ensuring transformations (rotate/mirror) are captured accurately before sending to the nesting engine.

## Final Verification Wave
1. Ensure `npm run tsc --noEmit` passes.
2. Import a DXF containing an arc > 180°. Verify it displays correctly in the workspace.
3. Open the Part Library. Verify the VectorPreview thumbnail shows the correct arc (not a full circle).
4. Run Nesting. Verify the generated SVG boundary for the part matches the actual arc shape, not a bounding box or full circle.