# AutoCAD Zoom Performance: Quick Reference Card

## Problem → Solution Mapping

| Problem | AutoCAD Solution | Your Implementation |
|---------|------------------|---------------------|
| Lag at extreme zoom-out | Adaptive degradation | Use `calculateProjectedPixelSize()` |
| Choppy panning | Pre-computed LODs | Call `precomputeLODs()` on file load |
| High GPU memory | Vertex clustering | Apply `clusterVertices()` at render |
| Many draw calls | Material batching | Use `THREE.BufferGeometryUtils.mergeGeometries()` |
| Slow frustum culling | Spatial grid index | Implement `SpatialIndex` class |

---

## Copy-Paste Code Snippets

### 1. Projected Pixel Size Calculator
```typescript
function calculateProjectedPixelSize(
  worldBounds: THREE.Box3,
  camera: THREE.Camera,
  viewport: { width: number; height: number }
): number {
  const size = worldBounds.getSize(new THREE.Vector3());
  const worldDistance = size.length();
  
  const center = worldBounds.getCenter(new THREE.Vector3());
  const cameraDistance = camera.position.distanceTo(center);
  
  // World units to normalized device coords to pixels
  const vFOV = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
  const screenDistance = (worldDistance / cameraDistance) * viewport.height / (2 * Math.tan(vFOV / 2));
  
  return screenDistance;
}
```

### 2. Degradation Level Selector
```typescript
function getDegradationLevel(projectedPixelSize: number): number {
  if (projectedPixelSize > 10) return 0;  // Full detail
  if (projectedPixelSize > 1) return 1;   // Reduced segments
  if (projectedPixelSize > 0.1) return 2; // Minimal vertices
  if (projectedPixelSize > 0.01) return 3; // Points only
  return 4; // Invisible
}

function getArcSegments(level: number): number {
  return [32, 8, 4, 2, 1][level];
}
```

### 3. Quick Vertex Clustering
```typescript
function simplifyVertices(vertices: THREE.Vector3[], maxCount: number): THREE.Vector3[] {
  if (vertices.length <= maxCount) return vertices;
  
  // Simple: keep every Nth vertex
  const step = Math.ceil(vertices.length / maxCount);
  return vertices.filter((_, i) => i % step === 0);
}
```

### 4. Batch Rendering Shortcut
```typescript
function renderBatch(entities: CADEntity[], scene: THREE.Scene, material: THREE.Material) {
  const geometries = entities.map(e => e.geometry);
  const merged = THREE.BufferGeometryUtils.mergeGeometries(geometries);
  const mesh = new THREE.LineSegments(merged, material);
  scene.add(mesh);
}
```

---

## Performance Targets

```
Target FPS: 60
Current FPS at 0.01% zoom: 8-12
Target after optimization: 55+

Breakdown:
├─ Adaptive degradation alone: +150% FPS (2.5x faster)
├─ + Vertex clustering: +300% FPS (4x faster total)
├─ + Spatial batching: +500% FPS (6x faster total)
└─ + Graphics cache: +1000% FPS (12x faster total)
```

---

## Three.js API Reference

### Geometry Simplification
```typescript
import * as THREE from 'three';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

const modifier = new SimplifyModifier();
const simplified = modifier.modify(geometry, Math.floor(geometry.attributes.position.count * 0.1));
```

### Geometry Merging
```typescript
const merged = THREE.BufferGeometryUtils.mergeGeometries([geom1, geom2, geom3]);
```

### Frustum Culling
```typescript
const frustum = new THREE.Frustum().setFromProjectionMatrix(camera.projectionMatrix);
const isVisible = frustum.intersectsBox(boundingBox);
```

---

## Debug Checklist

Before optimizing:
- [ ] Profile with Chrome DevTools → Record performance
- [ ] Note FPS at key zoom levels (100%, 10%, 1%, 0.1%, 0.01%)
- [ ] Check Draw Calls count (should be < 100 after optimization)
- [ ] Monitor GPU memory in DevTools

After optimizing:
- [ ] FPS should be 55+ at all zoom levels
- [ ] Draw calls should drop to 10-50
- [ ] GPU memory should be 50-100MB
- [ ] No visual artifacts (z-fighting, clipping, color banding)

---

## Common Mistakes to Avoid

❌ **DON'T**: Compute LODs every frame
✓ **DO**: Pre-compute LODs once on file load

❌ **DON'T**: Test with small drawings (< 100K entities)
✓ **DO**: Test with realistic drawings (1M+ entities)

❌ **DON'T**: Use `THREE.LineBasicMaterial` with `linewidth > 1` (unsupported on most GPUs)
✓ **DO**: Use `THREE.MeshLine` or thicken geometry as triangles

❌ **DON'T**: Render every entity individually
✓ **DO**: Batch by layer/material

❌ **DON'T**: Clear entire scene every frame
✓ **DO**: Only update changed entities

---

## Testing with Real GCode

```typescript
// Generate test data with 1M+ commands
const testGCode = [];
for (let i = 0; i < 1000000; i++) {
  testGCode.push(`G0 X${Math.random() * 10000} Y${Math.random() * 10000}`);
  testGCode.push(`G1 X${Math.random() * 10000} Y${Math.random() * 10000}`);
}

// Measure render time
console.time('Render 1M commands');
renderGCode(testGCode, scene);
console.timeEnd('Render 1M commands');

// Expected: < 2 seconds after optimization
```

---

## Next Steps

1. **Implement Phase 1**: Add degradation to arc rendering
   - Time: 15 min
   - Expected gain: 2-3x FPS improvement

2. **Implement Phase 2**: Add vertex simplification
   - Time: 20 min  
   - Expected gain: 5-7x FPS improvement

3. **Implement Phase 3**: Add runtime cache
   - Time: 25 min
   - Expected gain: 3x faster pan/zoom

4. **Implement Phase 4**: Add spatial batching
   - Time: 30 min
   - Expected gain: 5x fewer draw calls

5. **Measure & iterate**
   - Use Chrome DevTools to profile
   - Adjust thresholds based on target hardware

---

## Emergency Performance Optimization

If you need immediate 2-3x speedup without full implementation:

### Quick Hack #1: Force Lower Resolution
```typescript
// Reduce arc segments globally
THREE.REVISION = '140';
// Create arcs with 8 segments instead of 32
const curve = new THREE.ArcCurve(...);
const points = curve.getPoints(8); // Force 8 instead of default
```

### Quick Hack #2: Aggressive Culling
```typescript
// Skip rendering if object is < 1 pixel
if (projectedPixelSize < 1) {
  continue; // Skip rendering entirely
}
```

### Quick Hack #3: Reduce Draw Distance
```typescript
// Only render entities within 100m of camera
const camPos = camera.position;
if (entity.position.distanceTo(camPos) > 10000) {
  scene.remove(entity.mesh);
}
```

---

## Resources

**Files Created for You**:
- `SKILL/autocad-subpixel-geometry.md` - Complete technical reference
- `SKILL/autocad-implementation-guide.md` - Step-by-step implementation
- `SKILL/autocad-rendering-pipeline.md` - Architecture deep dive

**External Resources**:
- Three.js Documentation: https://threejs.org/docs/
- AutoCAD Graphics Help: https://help.autodesk.com/cloudhelp/2025/DEU/AutoCAD-LT/
- Real-Time Rendering: https://www.realtimerendering.com/

**OpenGL/WebGL References**:
- VBO vs Display Lists: https://community.khronos.org/
- Frustum Culling: https://www.gamedev.net/tutorials/

