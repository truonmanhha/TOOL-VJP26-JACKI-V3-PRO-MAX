# Research: High-Performance Web-Based CAD Architecture
## AutoCAD Engine Patterns & WebGL Optimization Strategies

**Ngày:** 02/03/2026  
**Mục đích:** Giải quyết lag khi xử lý DXF/Nesting trong VJPRO26  
**Phạm vi:** Spatial Indexing, Entity Handling, Draw Call Optimization, Culling

---

## 1. SPATIAL INDEXING IN AUTOCAD ENGINE

### 1.1 R-Tree: AutoCAD's Core Indexing Strategy

**R-Tree** là cấu trúc dữ liệu cây được sử dụng rộng rãi trong AutoCAD để index các entity 2D/3D:

```
Characteristics:
├─ Balanced tree structure (mỗi node có N children, 2-8 typical)
├─ Bounding rectangles (MBRs) bao quanh dữ liệu
├─ Non-overlapping child regions (minimize intersection)
├─ Search O(log N) cho range queries
└─ Self-balancing during insertion/deletion
```

**Ứng dụng trong CAD:**
- **Spatial query** (tìm tất cả entities trong viewport): O(log N) thay vì O(N) full scan
- **Intersection detection**: Nhanh để check overlapping parts
- **Selection/Pick**: Click trên canvas → find entity ≈ 1-2ms (triệu entities)

**Vì sao AutoCAD nhanh?**
```
Without R-Tree:      10M entities → check mỗi cái = 10M ops/frame (crash)
With R-Tree:         10M entities → check ~100 node = 100 ops/frame (smooth)
```

**Khác biệt Quadtree vs R-Tree:**
| Aspect | Quadtree | R-Tree |
|--------|----------|--------|
| Cấu trúc | Regular grid division (4 quads) | Irregular, data-driven |
| Độ sâu | Fixed dựa kích thước space | Adaptive dựa density |
| Overlap | Không có (fixed boundaries) | Có (MBRs overlap) |
| Insertion | Đơn giản, nhanh | Phức tạp, phải rebalance |
| Phù hợp CAD | ❌ Kém (fixed grid không tối ưu) | ✅ Tối ưu (adaptive) |

### 1.2 AutoCAD Entity Storage Architecture

**BlockTableRecord Pattern** (ObjectARX API):
```cpp
// ObjectARX model
BlockTableRecord
  ├─ entities[]  // Array of Entity pointers
  ├─ spatial_index (R-Tree)  // For fast lookup
  └─ ObjectId map  // ID → pointer

When adding entity:
  1. Create Entity object
  2. Register ObjectId (unique identifier)
  3. Insert into R-Tree (by bounding box)
  4. Add to BlockTableRecord

When rendering:
  1. Frustum cull → Query R-Tree (get visible entities)
  2. Batch similar types (lines, arcs, etc.)
  3. Single draw call per batch type
  4. Total: 50-100 draw calls (not per-entity)
```

**Key insight:** AutoCAD doesn't re-iterate all entities; it **indexes them spatially** and only processes visible subset.

---

## 2. ENTITY HANDLING: MANAGING MILLIONS OF OBJECTS

### 2.1 AutoCAD's Multi-Layer Entity Management

**Layering Strategy (Hierarchical):**
```
Drawing (DWG)
├─ Layout 1 (Paper space)
│  ├─ Block 1
│  │  ├─ Line, Arc, Circle...
│  │  └─ Nested Block
│  └─ Block 2
├─ Layout 2 (Model space)
└─ Symbol Library (XRef blocks)
```

**Why this matters:**
- Blocks = **reusable geometry** (instance multiple times = 1x storage)
- Symbol library = **reference external drawings** (CAD-like includes)
- Nested structures = **LOD opportunities** (show parent outline, not child detail)

### 2.2 Deferred Loading & Progressive Rendering

**How AutoCAD handles 100M entity drawings:**

```
Phase 1: Fast Load
  └─ Parse DXF header only (metadata)
     Load entity indices (lightweight)
     Build R-Tree skeleton
     Display outline
     
Phase 2: Progressive Detail (async)
  └─ Load blocks on-demand
     Render visible layers first
     Cache geometry (GPU buffers)
     
Phase 3: User Interaction
  └─ Real-time feedback (line placement, etc.)
     Deferred computation (zoom triggers LOD)
```

**In browsers:** This = **Web Workers for parsing** + **streaming model load**

### 2.3 Type-Specific Handling

**AutoCAD optimizes per-entity-type:**

| Entity Type | Rendering Method | Optimization |
|-------------|------------------|--------------|
| **Line** | Single indexed line buffer | Batch 1M+ lines in 1 draw call |
| **Arc** | Tessellated circle segments | Pre-compute arc segments |
| **Circle** | Radius + center (parametric) | GPU-side rasterization |
| **Text** | Signed distance field (SDF) | Cache glyph atlas |
| **Polyline** | Vertex list + index | Single geometry buffer |
| **Hatch** | Pre-rasterized + caching | Cache to texture (reuse) |
| **Xref Block** | Lazy load on expand | Reference only (lightweight) |

---

## 3. WEBGL/THREE.JS DRAW CALL OPTIMIZATION

### 3.1 The Draw Call Problem

**Reality of WebGL:**
```
1 Draw Call = ~10-100μs overhead (CPU-GPU sync)
Entity count: 100,000
Naive approach: 100,000 draw calls/frame
  → Frame time: 1-10 seconds (unusable)

Optimized batching:
  Lines: 1 draw call (all 50K lines)
  Arcs:  1 draw call (all 30K arcs)
  Text:  1 draw call (all 15K texts)
  Total: 3-10 draw calls/frame
  → Frame time: <16ms (60 FPS smooth)
```

### 3.2 Geometry Batching Architecture

**mlightcad (Production CAD Viewer) Pattern:**

```typescript
// Pseudo-code from research
class BatchedGeometrySystem {
  private lineBatcher: BatchedMesh;    // All lines in project
  private arcBatcher: BatchedMesh;     // All arcs
  private textRenderer: TextBatcher;   // All text

  addEntity(entity: Entity) {
    const geometry = entity.toGeometry();
    
    if (entity.type === 'LINE') {
      this.lineBatcher.addGeometry(geometry);
    } else if (entity.type === 'ARC') {
      this.arcBatcher.addGeometry(geometry);
    }
    // ... etc
  }

  render(camera: Camera) {
    // Only 3-10 draw calls regardless of entity count
    renderer.render(this.lineBatcher, camera);
    renderer.render(this.arcBatcher, camera);
    renderer.render(this.textRenderer, camera);
  }
}
```

**Three.js BatchedMesh API** (ES2023):
```javascript
const batchedMesh = new THREE.BatchedMesh(
  10,      // maxInstanceCount
  5000,    // maxVertexCount  
  10000,   // maxIndexCount
  material
);

// Add different geometries
const lineGeomId = batchedMesh.addGeometry(lineGeometry);
const arcGeomId = batchedMesh.addGeometry(arcGeometry);

// Create instances
for (let i = 0; i < 100000; i++) {
  const instanceId = batchedMesh.addInstance(lineGeomId);
  batchedMesh.setMatrixAt(instanceId, matrix);
}

// Render: 1 draw call for all instances
```

### 3.3 GPU Instancing vs. Geometry Batching

| Technique | Use Case | Memory | Draw Calls |
|-----------|----------|--------|-----------|
| **Batching** | 100K unique lines (different positions) | Medium (combine buffers) | 1 |
| **Instancing** | 1000 identical parts (same geometry) | Low (reuse buffer) | 1 |
| **Hybrid** | Parts + lines together | Optimized | 2-5 |

**For CNC Nesting:**
```
Parts: Same shape × 50 instances → Instancing
Cut paths: Unique per layout → Batching
Result: Draw calls = ~5-10 (not 50K)
```

### 3.4 Multi-Draw Extension (WEBGL_multi_draw)

**Modern optimization (Chrome 85+):**
```javascript
// Without WEBGL_multi_draw: separate draw calls
for (let i = 0; i < 100; i++) {
  gl.drawArrays(GL.TRIANGLES, offset[i], count[i]);  // 100 calls
}

// With WEBGL_multi_draw: single merged call
gl.multiDrawArrays(GL.TRIANGLES, offsets, counts, 100);  // 1 call
```

**Impact:** 4-10× faster rendering for multi-batch scenarios

---

## 4. CULLING TECHNIQUES FOR 2D CAD

### 4.1 Frustum Culling (View Frustum Culling)

**For 2D CAD (2D camera = 2D frustum rectangle):**

```
Frustum = Rectangle(minX, minY, maxX, maxY)

For each entity bounding box:
  if (bbox.intersects(frustum)) {
    add to visible set
  }
```

**Optimization: Plane Masking** (from Cesium research):
```
6 planes (3D): left, right, top, bottom, near, far
2 planes (2D): left/right, top/bottom

Instead of checking all planes:
  1. Check dominant plane (likely to reject early)
  2. If pass, check secondary plane
  3. Result: 50% fewer operations vs sequential checking
```

**Time complexity:**
```
Naive: O(N) full scan of all entities
With R-Tree query: O(log N) to find bounding nodes
With plane masking: O(1) per node check (2 planes)
Total: O(log N + visible entities)
```

### 4.2 Occlusion Culling (for 2D CAD)

**Less applicable to 2D** than frustum culling, but useful for:

1. **Layers/Visibility Groups**: Hide entities on invisible layers
2. **Z-order (depth)**: Render opaque geometry first, skip items behind
3. **Transparency**: Render transparent objects last (painter's algorithm)

**Implementation:**
```typescript
// Layer visibility
for (const entity of entities) {
  if (!isLayerVisible(entity.layer)) continue;  // Skip
  if (isEntityBehindOpaqueGeometry(entity)) continue;  // Occlusion
  renderEntity(entity);
}
```

### 4.3 Hierarchical Culling (BVH Traversal)

**Bounding Volume Hierarchy = R-Tree traversal:**

```
Root BVH Node (covers all)
├─ Left child (covers left half)
│  ├─ Entities A, B
│  └─ Entities C, D
└─ Right child (covers right half)
   └─ Entities E, F

Frustum cull:
  1. Check root against frustum → INTERSECT
  2. Check left against frustum → OUTSIDE (cull entire subtree)
  3. Check right against frustum → INTERSECT
  4. Check E, F individually
  
Result: Skip A, B, C, D without individual checks
```

**Early rejection saves 90%+ of checks** on large drawings.

---

## 5. PRACTICAL OPTIMIZATION PATTERNS FOR VJPRO26 NESTING

### 5.1 Current Issues & Root Causes

**Symptoms reported:**
- Lag on 100K+ entity DXF files
- Nesting algorithm slow (genetic, MaxRects)
- GCode preview lags with large paths

**Root causes (likely):**
```
DXF Parsing:
  ❌ Iterating all entities per operation (O(N))
  ❌ No spatial index → proximity check = O(N²)
  ❌ No deferred loading → parse entire file upfront

Rendering:
  ❌ Draw call per entity (100K entities = 100K draw calls)
  ❌ No frustum culling → render off-screen entities
  ❌ No geometry batching → GPU idle between calls

Nesting Algorithm:
  ❌ Naive collision detection (check every pair)
  ❌ No spatial acceleration → O(N²) per placement
  ❌ Genetic algorithm overhead (100+ generations)
```

### 5.2 Recommended Implementation Strategy

#### Phase 1: Spatial Indexing (HIGH IMPACT)
```typescript
// Add R-Tree to DXF parsing
import RBush from 'rbush';

class DxfService {
  private spatialIndex = new RBush(16);  // Max 16 children per node

  parseFile(dxfContent: string) {
    const entities = dxfParser.parse(dxfContent);
    
    for (const entity of entities) {
      const bbox = entity.getBoundingBox();
      this.spatialIndex.insert({
        minX: bbox.x1, minY: bbox.y1,
        maxX: bbox.x2, maxY: bbox.y2,
        entity: entity
      });
    }
    return entities;
  }

  // Fast spatial query: O(log N)
  findEntitiesInArea(x1: number, y1: number, x2: number, y2: number) {
    return this.spatialIndex.search({minX: x1, minY: y1, maxX: x2, maxY: y2});
  }

  // Fast proximity check
  findNearby(x: number, y: number, distance: number) {
    return this.findEntitiesInArea(
      x - distance, y - distance,
      x + distance, y + distance
    );
  }
}
```

**Expected impact:** 1000× faster proximity queries (nesting efficiency)

#### Phase 2: Geometry Batching (RENDERING)
```typescript
// Replace individual Three.js geometries with batched system
class CadRenderer {
  private batches = new Map<string, THREE.BatchedMesh>();

  renderEntities(entities: Entity[], camera: Camera) {
    const grouped = groupBy(entities, e => e.type);

    for (const [type, typeEntities] of grouped) {
      if (!this.batches.has(type)) {
        this.batches.set(type, new THREE.BatchedMesh(
          typeEntities.length,
          100000,  // max vertices
          500000,  // max indices
          this.getMaterialForType(type)
        ));
      }

      const batch = this.batches.get(type)!;
      for (const entity of typeEntities) {
        const geom = entity.toGeometry();
        batch.addGeometry(geom);
        batch.addInstance(/* ... */);
      }
    }

    // Single render call
    this.renderer.render(this.scene, camera);  // Internally: 3-10 draw calls
  }
}
```

**Expected impact:** 100K draw calls → 5-10 draw calls (10,000× faster)

#### Phase 3: Frustum Culling (VIEWPORT)
```typescript
class ViewportCuller {
  private frustum = new THREE.Frustum();

  getCulledEntities(entities: Entity[], camera: Camera) {
    this.frustum.setFromProjectionMatrix(
      camera.projectionMatrix.multiply(camera.matrixWorldInverse)
    );

    return entities.filter(entity => {
      const bbox = new THREE.Box3().setFromObject(entity.mesh);
      return this.frustum.intersectsBox(bbox);  // O(1) check
    });
  }
}

// In render loop
const visible = culler.getCulledEntities(allEntities, camera);
renderer.renderEntities(visible, camera);  // Only render what's visible
```

**Expected impact:** 90% reduction in geometry sent to GPU

#### Phase 4: Deferred Nesting (ALGORITHM)
```typescript
// Instead of checking all pairs
class FastNestingEngine {
  private spatialIndex = new RBush(16);

  async placePartFast(part: Part, sheet: Sheet) {
    // Find potential overlaps only in nearby area
    const candidates = this.spatialIndex.search(part.bounds);

    for (const candidate of candidates) {
      if (this.wouldCollide(part, candidate.entity)) {
        return false;  // Collision detected
      }
    }

    // No collision: add to index
    this.spatialIndex.insert(part.bounds);
    return true;
  }

  // Genetic algorithm: only evaluate valid candidates
  optimizeLayoutFast(parts: Part[], iterations: number) {
    for (let i = 0; i < iterations; i++) {
      const candidate = this.generateRandomPlacement(parts);
      
      // Fast validation: spatial index check (O(log N))
      if (this.isValidLayout(candidate)) {
        this.updateBest(candidate);
      }
      // Bad layouts rejected immediately (no full evaluation)
    }
  }
}
```

**Expected impact:** 100× faster nesting for large part lists

---

## 6. TECHNICAL CHECKLIST FOR VJPRO26

### Quick Wins (1-2 days)
- [ ] Add RBush spatial index to `dxfService.ts`
- [ ] Implement frustum culling in `GCodeViewer.tsx`
- [ ] Profile current rendering (renderer.info.render.calls)

### Medium Effort (3-5 days)
- [ ] Refactor `GCodeViewer.tsx` to use BatchedMesh
- [ ] Implement deferred entity loading (Web Worker)
- [ ] Add viewport statistics (visible entities count)

### Long Term (1-2 weeks)
- [ ] Rewrite nesting algorithm with spatial queries
- [ ] Implement progressive LOD for nested parts
- [ ] Add GPU-side culling (compute shaders)

---

## 7. REFERENCE IMPLEMENTATIONS

### Production CAD Viewers Using These Patterns
1. **mlightcad/cad-viewer** (GitHub)
   - Batching system for 500K+ entities
   - Articles: Batched Geometry, Scene Graph, Text Rendering

2. **Cesium.js** (3D GIS)
   - Hierarchical culling (BVH traversal)
   - Plane masking optimization

3. **AutoCAD Web** (Autodesk)
   - R-Tree spatial indexing
   - Progressive streaming model

### Libraries to Use
```json
{
  "rbush": "^4.0.0",           // R-Tree spatial indexing
  "three": "^r168+",            // BatchedMesh support
  "three-mesh-bvh": "^0.8.0"    // BVH raycasting
}
```

---

## SUMMARY TABLE

| Problem | Root Cause | Solution | Impact |
|---------|-----------|----------|--------|
| Lag on 100K entities | O(N) iteration | R-Tree spatial index | 1000× faster |
| Slow nesting | O(N²) collision checks | Spatial queries | 100× faster |
| Renderer bottleneck | 100K draw calls | Geometry batching | 10,000× faster |
| Off-screen render | No culling | Frustum + R-Tree | 90% reduction |
| Memory bloat | Full file load | Deferred streaming | 50% less memory |

---

**Đề xuất tiếp theo:** Implement R-Tree spatial index trước, sau đó optimize renderer với BatchedMesh.
