# Learnings - Fix DXF Line Parsing

- File `12lyaa.dxf` contains 1364 LINE and 417 ARC entities (Total 1781).
- Independent parser test confirmed all 1781 entities are parsed correctly from the DXF file.
- Defensive parsing has been added to `services/dxfService.ts` and `components/NestingAX/services/dxfService.ts` to handle both `vertices` and `start`/`end` properties for LINE entities.
- The issue likely lies in the post-parsing stage: SmartJoin, Tolerance filtering, or Rendering logic.


## Investigation: VectorPreview.tsx + dxfService.ts (2026-02-24)

### Architecture Overview
Two separate DXF pipelines exist:
1. **DxfTool pipeline** (`services/dxfService.ts` → `components/DxfTool.tsx`): Uses `parseFile()` + `smartJoin()`. This is the DXF analysis tool.
2. **NestingAX pipeline** (`components/NestingAX/services/dxfService.ts` → `Workspace.tsx`): Uses `parseImportFile()` → `parseDxfFile()`. No smartJoin. This is the nesting tool.

The `VectorPreview.tsx` + `cadEntitiesToGeometry()` are used ONLY by Workspace.tsx (NestingAX pipeline) for Part/Sheet preview thumbnails.

### Finding 1: `smartJoin` does NOT exist in NestingAX dxfService
`smartJoin` exists only in `services/dxfService.ts` (DxfTool pipeline). The NestingAX `components/NestingAX/services/dxfService.ts` has NO joining/merging logic at all. So `smartJoin` is NOT the cause of missing entities in the nesting tool.

### Finding 2: `smartJoin` in services/dxfService.ts has entity-dropping bugs
File: `services/dxfService.ts`, lines 117-131
**BUG 1 - Filter drops open LINE/ARC entities (line 130):**
```typescript
.filter(e => e.verticesCount > 1 || e.area > 0.001)
```
This filter is applied AFTER joining. Any entity with `verticesCount <= 1` AND `area <= 0.001` is dropped. But standalone LINEs that couldn't be joined have `verticesCount = 2`, so they survive. The real risk is degenerate entities (1 point) — LOW RISK.

**BUG 2 - joinPaths skips already-closed paths (line 188):**
```typescript
if (this.dist(s1, e1) < 0.0001 && p1.length > 2) continue;
```
Already-closed paths are skipped entirely in the inner loop. This is correct behavior — they shouldn't be joined further.

**BUG 3 - Tolerance-dependent merging can swallow paths (lines 196-204):**
The `joinPaths` merges path A and path B if ANY endpoint pair is within `tolerance`. With default `tolerance = 0.5mm`, paths up to 0.5mm apart get forcibly merged. If two disjoint LINE segments happen to have an endpoint within 0.5mm, they get wrongly merged into a single polyline, losing their individual identity.

### Finding 3: services/dxfService.ts LINE filter drops zero-length lines (line 65)
```typescript
if (this.dist(p1, p2) > 0.0001) {
  rawPaths.push({ points: [p1, p2], originalType: 'LINE' });
}
```
Lines shorter than 0.0001 units are silently dropped. After `snap()` rounding (4 decimal places), two points that differ by less than 0.0001 become identical. This is correct for degenerate points but could drop micro-lines if snap resolution is too coarse.

### Finding 4: VectorPreview `cadEntitiesToGeometry` is SAFE for LINE/ARC
File: `components/nesting/NewNestList/VectorPreview.tsx`, lines 249-354
- **LINE handling (lines 257-268):** Correctly supports both `{start,end}` and `points[]` formats. No filtering.
- **ARC handling (lines 324-346):** Correctly computes 32-segment polyline approximation. Uses `startAngle/endAngle` from entity properties. No filtering.
- **No tolerance/filter/threshold applied.** All entities passed in are rendered.

### Finding 5: VectorPreview rendering has an edge-case silent fail
File: `VectorPreview.tsx`, lines 100-108:
```typescript
if (geomWidth === 0 || geomHeight === 0) {
  ctx.fillText('Too Small', width / 2, height / 2);
  return;
}
```
If ALL entities lie on a single horizontal or vertical line (geomWidth=0 or geomHeight=0), the preview shows 'Too Small' and renders NOTHING. This could happen with a part that's purely 1D.

### Finding 6: NestingAX Workspace canvas rendering handles all types correctly
File: `Workspace.tsx`, lines 2744-2868:
- `line` → SVG `<line>` ✓
- `arc` → SVG `<path>` with arc data (needs `properties.centerX/Y/radius` + 3 points) ✓
- `polyline` → SVG `<polyline>` ✓
- `circle` → SVG `<circle>` ✓
- Filtering: Only by layer visibility (line 2747-2751). No tolerance or size filtering.

### Finding 7: ARC entities from NestingAX DXF parser lack `startAngle`/`endAngle` in properties
File: `components/NestingAX/services/dxfService.ts`, lines 105-121 (fallback parser):
ARC entities are stored as 3 points [start, mid, end] with `properties: { radius, centerX, centerY }`. The `cadEntitiesToGeometry()` in VectorPreview expects `startAngle` and `endAngle` (lines 328-329):
```typescript
const startAngleDeg = entity.startAngle ?? entity.properties?.startAngle ?? 0;
const endAngleDeg   = entity.endAngle   ?? entity.properties?.endAngle   ?? 360;
```
Since neither `entity.startAngle` nor `entity.properties.startAngle` exists on NestingAX-parsed ARC entities, **both default to 0° and 360° respectively**, rendering the ARC as a FULL CIRCLE instead of the actual arc. This means ARC geometry in VectorPreview is WRONG (shows full circle), but is NOT lost.

### ROOT CAUSE HYPOTHESIS
The entities are NOT being lost in parsing or rendering. The likely root cause is upstream:
1. **DxfTool pipeline**: `smartJoin` tolerance-based merging (0.5mm default) can merge separate LINE/ARC segments into combined polylines, losing track of individual entities. But entity COUNT should remain similar.
2. **NestingAX pipeline**: Entities are parsed correctly and rendered correctly on the Workspace canvas. The `cadEntitiesToGeometry` (VectorPreview) renders them correctly too, with the ARC angle bug noted above.
3. **The 'missing entities' issue** likely occurs when the user selects entities on canvas to create a part — the selection mechanism (`getEntitiesInSelection` in AutoPartCreation.ts) may miss entities outside the selection box or fail on certain entity types.

### RECOMMENDED FIXES
1. **services/dxfService.ts `smartJoin`**: Add logging before the final `.filter()` to show which entities are being dropped. Consider removing the `area > 0.001` condition or making it configurable.
2. **VectorPreview `cadEntitiesToGeometry`**: Fix ARC angle handling — compute `startAngle`/`endAngle` from the 3-point representation (`properties.centerX/Y` + `points[0]`/`points[2]`) instead of defaulting to 0°-360°.
3. **VectorPreview bounding box**: Handle `geomWidth === 0 || geomHeight === 0` case by adding a small epsilon padding instead of aborting render.
4. **Investigate `AutoPartCreation.ts`**: Check `getEntitiesInSelection` and `createPartFromSelection` for entity type filtering that might exclude LINE/ARC.
5. **NestingAX DXF parser**: Store `startAngle`/`endAngle` (in degrees) in ARC entity properties so `cadEntitiesToGeometry` can use them correctly.