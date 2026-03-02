# 🎯 Web CAD Engine - Advanced Rendering Optimization Techniques

## 📋 Mục lục
1. [GPU Culling (Frustum/Occlusion)](#gpu-culling-frustumocclusion)
2. [Dynamic LOD (Level of Detail)](#dynamic-lod-level-of-detail)
3. [ArrayBuffer Serialization & SharedArrayBuffer](#arraybuffer-serialization--sharedarraybuffer)
4. [Instanced Rendering cho Lines](#instanced-rendering-cho-lines)
5. [Reference Implementations](#reference-implementations)
6. [Best Practices](#best-practices)

---

## 1. GPU Culling (Frustum/Occlusion)

### 🔍 Khái Niệm
GPU culling loại bỏ hoàn toàn các đối tượng nằm ngoài camera frustum **ngay trên GPU**, không cần phải gửi chúng tới render pipeline.

### 📚 Key Resources
- **gpu-culling** (CodyJasonBennett): GitHub repo chứa WebGL implementation
- **Three.js Blocks - ComputeInstanceCulling**: WebGPU-based culling cho massive instanced meshes
- **Depth Pre-Pass Optimization**: Alternative approach sử dụng depth texture

### 🛠️ Implementation Patterns

#### Pattern 1: Frustum Culling (CPU-based check)
```typescript
// Dựa trên Three.js Frustum class
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();

projScreenMatrix.multiplyMatrices(
  camera.projectionMatrix,
  camera.matrixWorldInverse
);
frustum.setFromProjectionMatrix(projScreenMatrix);

// Cull instances không nằm trong frustum
instancedMesh.geometry.boundingSphere.forEach((sphere, idx) => {
  if (!frustum.intersectsSphere(sphere)) {
    // Mark as culled
    visibleInstances[idx] = false;
  }
});
```

#### Pattern 2: GPU-Driven Frustum Culling (WebGPU)
```glsl
// Compute shader (WebGPU)
@compute @workgroup_size(256)
fn cull(@builtin(global_invocation_id) gid: vec3<u32>) {
  let instanceIdx = gid.x;
  let bounds = getBoundingSphere(instanceIdx);
  
  // Test against 6 frustum planes
  var inFrustum = true;
  for (var i = 0u; i < 6u; i++) {
    let plane = frustumPlanes[i];
    let dist = dot(plane.xyz, bounds.center) - plane.w;
    if (dist + bounds.radius < 0.0) {
      inFrustum = false;
      break;
    }
  }
  
  if (inFrustum) {
    // Write to visible buffer atomically
    let idx = atomicAdd(&visibleCounter, 1u);
    visibleInstances[idx] = instanceIdx;
  }
}
```

#### Pattern 3: Occlusion Culling (Depth-based)
```glsl
// Fragment shader - depth pre-pass
void main() {
  // Render only depth, no color
  gl_FragDepth = gl_FragCoord.z;
}

// Main pass - check against depth texture
vec4 worldPos = vec4(vPosition, 1.0);
vec4 viewPos = viewMatrix * worldPos;
vec4 clipPos = projectionMatrix * viewPos;
vec2 screenUV = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
float sceneDepth = texture(depthTexture, screenUV).r;

if (clipPos.z > sceneDepth) {
  discard; // Occluded
}
```

### 🎯 Performance Impact
- **Frustum Culling**: 20-50% reduction trong draw calls cho large scenes
- **Occlusion Culling**: 30-70% reduction, nhưng đắt hơn CPU
- **Recommended**: Use frustum culling cho CAD drawings (vì geometries thường axis-aligned)

### ⚠️ Gotchas
1. **Bounding box precision**: Sai bounding box → render artifacts
2. **Culling overhead**: GPU culling có overhead, chỉ worth với 10k+ instances
3. **Transparency**: Occlusion culling không work với transparent objects

---

## 2. Dynamic LOD (Level of Detail)

### 🔍 Khái Niệm
Thay đổi complexity của geometry **dựa trên screen-space pixel size**, không phải camera distance. Điều này giúp maintain visual quality mà vẫn tối ưu performance.

### 📊 Screen-Space LOD Formula
```typescript
// Tính pixel size của bounding sphere trên màn hình
function getScreenSpaceSize(bounds: Sphere, camera: Camera): number {
  const worldPos = new THREE.Vector3().copy(bounds.center);
  const screenPos = worldPos.project(camera);
  
  // Tính bán kính trong screen space
  const radius = bounds.radius;
  const distToCamera = worldPos.distanceTo(camera.position);
  
  // Tính FOV-adjusted pixel size
  const pixelSize = (radius / distToCamera) * 
    (canvas.height / (2 * Math.tan(camera.fov * Math.PI / 360)));
  
  return pixelSize;
}

// LOD selection logic
function selectLOD(pixelSize: number): LODLevel {
  if (pixelSize > 100) return LOD.HIGH;      // High detail
  if (pixelSize > 30) return LOD.MEDIUM;     // Medium detail
  if (pixelSize > 10) return LOD.LOW;        // Low detail
  return LOD.VERYLOW;                        // Minimal detail
}
```

### 🎨 Implementation Approaches

#### Approach 1: Pre-made LOD Meshes (Traditional Three.js)
```typescript
// Three.js LOD class - simplest approach
const lod = new THREE.LOD();

// Tạo 3 versions của mesh với độ phân giải khác nhau
const highDetail = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 6),  // 1280 triangles
  material
);
const mediumDetail = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 4),  // 320 triangles
  material
);
const lowDetail = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 2),  // 80 triangles
  material
);

lod.addLevel(highDetail, 50);      // Thay đổi khi > 50px
lod.addLevel(mediumDetail, 150);   // Thay đổi khi > 150px
lod.addLevel(lowDetail, 500);      // Thay đổi khi > 500px

scene.add(lod);
```

#### Approach 2: Dynamic Simplification (Runtime)
```typescript
// Sử dụng mesh simplification library (e.g., simplify.js)
import { simplify } from 'simplify-js';

function createDynamicLOD(geometry: THREE.BufferGeometry): THREE.LOD {
  const originalVertices = geometry.attributes.position.array;
  const lod = new THREE.LOD();
  
  // Generate LOD levels on-the-fly
  const levels = [
    { pixels: 50, ratio: 1.0 },      // 100% detail
    { pixels: 150, ratio: 0.5 },     // 50% detail
    { pixels: 500, ratio: 0.1 },     // 10% detail
  ];
  
  levels.forEach(({ pixels, ratio }) => {
    const simplifiedGeometry = new THREE.BufferGeometry();
    const simplifiedVertices = simplifyGeometry(
      geometry,
      Math.floor(originalVertices.length * ratio)
    );
    simplifiedGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(simplifiedVertices, 3)
    );
    
    const mesh = new THREE.Mesh(simplifiedGeometry, material);
    lod.addLevel(mesh, pixels);
  });
  
  return lod;
}

function simplifyGeometry(
  geometry: THREE.BufferGeometry,
  targetCount: number
): Float32Array {
  // Use simplify.js hay tương tự
  const positions = geometry.attributes.position.array as Float32Array;
  const indices = geometry.index?.array as Uint32Array;
  
  // Simplify using quadric error metrics
  return performQuadricSimplification(positions, indices, targetCount);
}
```

#### Approach 3: Polygon Reduction for Polylines (CAD-specific)
```typescript
// For CAD drawings - reduce polyline vertices dựa trên screen resolution
function simplifyPolylineByPixelSize(
  points: Vector2[],
  pixelSize: number,
  tolerance: number = 1.0  // pixel tolerance
): Vector2[] {
  if (pixelSize > 50) {
    // High detail - keep all points
    return points;
  } else if (pixelSize > 20) {
    // Medium - remove points closer than 2 pixels
    return douglasPeucker(points, tolerance * 2);
  } else {
    // Low detail - aggressive simplification
    return douglasPeucker(points, tolerance * 5);
  }
}

// Douglas-Peucker algorithm
function douglasPeucker(
  points: Vector2[],
  epsilon: number
): Vector2[] {
  if (points.length < 3) return points;
  
  let maxDist = 0;
  let maxIdx = 0;
  
  // Find point with maximum distance from line
  const line = [points[0], points[points.length - 1]];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToLineDistance(points[i], line);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > epsilon) {
    // Recursively simplify
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    // Remove intermediate points
    return [line[0], line[1]];
  }
}
```

### 🎯 Performance Metrics
- **Frame rate improvement**: 30-60% khi LOD properly configured
- **Best for**: Large polyline drawings, complex hatches, dense point clouds
- **Overhead**: ~5ms per frame cho LOD calculation (negligible vs. rendering)

### ⚠️ Common Pitfalls
1. **Popping artifacts**: Không blend giữa LOD levels → visible transition
2. **Over-simplification**: Mất chi tiết quan trọng
3. **Dynamic creation cost**: Creating LOD on-the-fly đắt, pre-bake nếu có thể

---

## 3. ArrayBuffer Serialization & SharedArrayBuffer

### 🔍 Khái Niệm
**SharedArrayBuffer** cho phép Main Thread và Web Worker **cùng truy cập** bộ nhớ geometry mà không copy data. Giảm 50-80% memory overhead + latency.

### ⚠️ Security Requirements
```typescript
// SharedArrayBuffer yêu cầu COOP + COEP headers
// In server.js (Express):
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
```

### 📚 Implementation Patterns

#### Pattern 1: Shared Geometry Buffer
```typescript
// Main Thread
class SharedGeometryBuffer {
  constructor(vertexCount: number) {
    // Tạo SharedArrayBuffer thay vì ArrayBuffer
    this.buffer = new SharedArrayBuffer(
      vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
    );
    this.positions = new Float32Array(this.buffer);
    
    // Buffer này được shared với worker
  }
  
  uploadToGPU(gl: WebGLRenderingContext) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    
    // WebGL can read from SharedArrayBuffer directly
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.buffer,  // Pass SharedArrayBuffer
      gl.STATIC_DRAW
    );
    
    return vbo;
  }
}

// Worker Thread - cùng truy cập memory
self.onmessage = (e) => {
  const { buffer } = e.data;
  const positions = new Float32Array(buffer);
  
  // Modify positions directly
  // Main thread sẽ thấy changes ngay (no copy!)
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += Math.sin(i);     // Modify in-place
    positions[i + 1] += Math.cos(i);
    positions[i + 2] += 0.1;
  }
  
  // Notify main thread calculation done
  self.postMessage({ status: 'complete' });
};
```

#### Pattern 2: Geometry Processing Pipeline (Main + Worker)
```typescript
// Main Thread - setup
const vertexCount = 100000;
const indexCount = 150000;

// Shared buffers
const positionBuffer = new SharedArrayBuffer(
  vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
);
const normalBuffer = new SharedArrayBuffer(
  vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT
);
const indexBuffer = new SharedArrayBuffer(
  indexCount * Uint32Array.BYTES_PER_ELEMENT
);

const positions = new Float32Array(positionBuffer);
const normals = new Float32Array(normalBuffer);
const indices = new Uint32Array(indexBuffer);

// Upload initial data
loadDXFFile('drawing.dxf', positions, indices);

// Send to worker for processing
const worker = new Worker('geometry.worker.ts');
worker.postMessage({
  type: 'processGeometry',
  positionBuffer,
  normalBuffer,
  indexBuffer,
  vertexCount,
  indexCount,
});

// Worker will compute normals in-place
worker.onmessage = (e) => {
  if (e.data.status === 'normals_computed') {
    // Normals are already in normalBuffer!
    uploadToGPU(positions, normals, indices);
  }
};

// ========================================
// Worker Thread - heavy computation
self.onmessage = (e) => {
  const {
    positionBuffer,
    normalBuffer,
    indexBuffer,
    vertexCount,
    indexCount,
  } = e.data;
  
  const positions = new Float32Array(positionBuffer);
  const normals = new Float32Array(normalBuffer);
  const indices = new Uint32Array(indexBuffer);
  
  // Compute normals using shared buffers
  // Zero-copy computation!
  computeVertexNormals(positions, normals, indices);
  
  self.postMessage({ status: 'normals_computed' });
};

function computeVertexNormals(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array
) {
  // Accumulate normals from faces
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    
    // Get vertices
    const v0 = new THREE.Vector3(
      positions[i0], positions[i0 + 1], positions[i0 + 2]
    );
    const v1 = new THREE.Vector3(
      positions[i1], positions[i1 + 1], positions[i1 + 2]
    );
    const v2 = new THREE.Vector3(
      positions[i2], positions[i2 + 1], positions[i2 + 2]
    );
    
    // Compute face normal
    const e1 = v1.clone().sub(v0);
    const e2 = v2.clone().sub(v0);
    const faceNormal = e1.cross(e2);
    
    // Add to vertex normals (shared buffer)
    const addToNormal = (idx: number, normal: THREE.Vector3) => {
      const baseIdx = idx * 3;
      normals[baseIdx] += normal.x;
      normals[baseIdx + 1] += normal.y;
      normals[baseIdx + 2] += normal.z;
    };
    
    addToNormal(indices[i], faceNormal);
    addToNormal(indices[i + 1], faceNormal);
    addToNormal(indices[i + 2], faceNormal);
  }
  
  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(
      normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2
    );
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
}
```

#### Pattern 3: Atomic Operations (Thread-safe Updates)
```typescript
// For shared state updates (e.g., visible instance count)
const atomicCounterBuffer = new SharedArrayBuffer(
  Uint32Array.BYTES_PER_ELEMENT
);
const atomicCounter = new Uint32Array(atomicCounterBuffer);

// Worker increments atomically
Atomics.add(atomicCounter, 0, 1);  // Thread-safe increment

// Main thread reads without race condition
const count = Atomics.load(atomicCounter, 0);
```

### 🎯 Performance Impact
- **Memory reduction**: 50-80% (no copy overhead)
- **Latency**: 1-2ms less per frame (no postMessage serialization)
- **Limitations**: Only for **typed arrays** (Float32Array, Uint32Array, etc.)

### ⚠️ Critical Notes
1. **Browser support**: Chrome 68+, Firefox 79+, Safari 15.2+ (thêm COOP/COEP)
2. **Spectre mitigation**: Nhiều browsers yêu cầu process isolation
3. **Data races**: Manual synchronization cần thiết (dùng Atomics)
4. **Not for WebGL textures**: SharedArrayBuffer không work với WebGL texture uploads

---

## 4. Instanced Rendering cho Lines

### 🔍 Khái Niệm
Render hàng chục ngàn lines trong **một draw call** sử dụng **instanced geometry** + vertex shader logic.

### 🛠️ Implementation

#### Approach 1: Line Segments as Quad Instances (wwwtyro pattern)
```glsl
// Vertex Shader
#version 300 es
precision highp float;

// Per-line data (instanced)
in vec3 a_start;
in vec3 a_end;
in vec4 a_color;
in float a_width;

// Per-vertex data (not instanced)
in vec2 a_localPos;  // (-1, -1), (-1, 1), (1, 1), (1, -1) for quad corners

out vec4 v_color;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec2 viewport;

void main() {
  // Transform line endpoints to screen space
  vec4 start_proj = projectionMatrix * viewMatrix * vec4(a_start, 1.0);
  vec4 end_proj = projectionMatrix * viewMatrix * vec4(a_end, 1.0);
  
  vec2 start_screen = start_proj.xy / start_proj.w;
  vec2 end_screen = end_proj.xy / end_proj.w;
  
  // Line direction in screen space
  vec2 dir = normalize(end_screen - start_screen);
  vec2 normal = vec2(-dir.y, dir.x);
  
  // Create quad around line with width
  vec2 offset = normal * a_width / 2.0;
  
  vec2 vertex_screen;
  if (a_localPos.y < 0.0) {
    // Top or bottom
    vertex_screen = mix(start_screen, end_screen, (a_localPos.x + 1.0) / 2.0);
    vertex_screen += offset * sign(a_localPos.y);
  }
  
  // Convert back to clip space
  gl_Position = vec4(vertex_screen, start_proj.z, start_proj.w);
  v_color = a_color;
}

// Fragment Shader
#version 300 es
precision highp float;

in vec4 v_color;
out vec4 outColor;

void main() {
  outColor = v_color;
}
```

#### TypeScript Setup for Instanced Lines
```typescript
class InstancedLineGeometry {
  private positions: Float32Array;
  private colors: Float32Array;
  private widths: Float32Array;
  private geometry: THREE.BufferGeometry;
  private instanceCount: number = 0;
  
  constructor(maxLines: number = 10000) {
    this.geometry = new THREE.BufferGeometry();
    
    // Per-line data (instanced attributes)
    this.positions = new Float32Array(maxLines * 6);  // start.xyz + end.xyz
    this.colors = new Float32Array(maxLines * 8);    // start.rgba + end.rgba
    this.widths = new Float32Array(maxLines);        // line width
    
    // Quad corners (non-instanced, reused)
    const quadVertices = new Float32Array([
      -1, -1,  // bottom-left
      -1, 1,   // top-left
      1, 1,    // top-right
      1, -1,   // bottom-right
    ]);
    
    const quadIndices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
    
    // Bind quad geometry
    this.geometry.setAttribute(
      'a_localPos',
      new THREE.BufferAttribute(quadVertices, 2)
    );
    this.geometry.setIndex(
      new THREE.BufferAttribute(quadIndices, 1)
    );
    
    // Create instanced attributes
    const positionAttr = new THREE.BufferAttribute(
      this.positions,
      3,
      false  // not normalized
    );
    positionAttr.divisor = 1;  // Advance every instance
    this.geometry.setAttribute('a_start', positionAttr);
    
    const colorAttr = new THREE.BufferAttribute(
      this.colors,
      4,
      true  // normalized 0-1
    );
    colorAttr.divisor = 1;
    this.geometry.setAttribute('a_color', colorAttr);
    
    const widthAttr = new THREE.BufferAttribute(
      this.widths,
      1
    );
    widthAttr.divisor = 1;
    this.geometry.setAttribute('a_width', widthAttr);
  }
  
  addLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0xffffff),
    width: number = 1.0
  ) {
    if (this.instanceCount >= this.positions.length / 6) {
      console.warn('Max lines reached');
      return;
    }
    
    const idx = this.instanceCount;
    
    // Store start/end
    this.positions[idx * 6] = start.x;
    this.positions[idx * 6 + 1] = start.y;
    this.positions[idx * 6 + 2] = start.z;
    this.positions[idx * 6 + 3] = end.x;
    this.positions[idx * 6 + 4] = end.y;
    this.positions[idx * 6 + 5] = end.z;
    
    // Store color
    this.colors[idx * 4] = color.r;
    this.colors[idx * 4 + 1] = color.g;
    this.colors[idx * 4 + 2] = color.b;
    this.colors[idx * 4 + 3] = 1.0;
    
    // Store width
    this.widths[idx] = width;
    
    this.instanceCount++;
  }
  
  updateGPU() {
    // Mark buffers as dirty
    this.geometry.attributes.a_start.needsUpdate = true;
    this.geometry.attributes.a_color.needsUpdate = true;
    this.geometry.attributes.a_width.needsUpdate = true;
  }
  
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    const material = new THREE.RawShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        projectionMatrix: { value: camera.projectionMatrix },
        viewMatrix: { value: camera.matrixWorldInverse },
        viewport: { value: new THREE.Vector2(
          renderer.domElement.width,
          renderer.domElement.height
        ) },
      },
    });
    
    const mesh = new THREE.Mesh(this.geometry, material);
    renderer.render(mesh, camera);
  }
}
```

#### Approach 2: Batched Line Rendering (CAD-optimized)
```typescript
// For DXF drawings with thousands of line segments
class CADLineBatcher {
  private batchSize = 1000;
  private batches: Map<string, InstancedLineGeometry> = new Map();
  
  constructor(private scene: THREE.Scene) {}
  
  addLinesFromDXF(dxfEntities: DXFEntity[]) {
    for (const entity of dxfEntities) {
      if (entity.type !== 'LINE' && entity.type !== 'LWPOLYLINE') continue;
      
      const key = `${entity.layer}-${entity.color}`;
      if (!this.batches.has(key)) {
        this.batches.set(key, new InstancedLineGeometry(this.batchSize));
      }
      
      const batch = this.batches.get(key)!;
      
      if (entity.type === 'LINE') {
        batch.addLine(
          new THREE.Vector3(entity.start.x, entity.start.y, 0),
          new THREE.Vector3(entity.end.x, entity.end.y, 0),
          new THREE.Color(entity.color),
          entity.lineWidth || 1
        );
      } else if (entity.type === 'LWPOLYLINE') {
        // Add line segments for each edge
        for (let i = 0; i < entity.points.length - 1; i++) {
          batch.addLine(
            new THREE.Vector3(entity.points[i].x, entity.points[i].y, 0),
            new THREE.Vector3(entity.points[i + 1].x, entity.points[i + 1].y, 0),
            new THREE.Color(entity.color),
            entity.lineWidth || 1
          );
        }
      }
    }
  }
  
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    for (const batch of this.batches.values()) {
      batch.updateGPU();
      batch.render(renderer, camera);
    }
  }
}
```

### 📊 Performance Metrics
- **Draw call reduction**: 10,000 lines → 1 draw call (vs. 10,000 separate draw calls)
- **Frame time**: 2-3ms for 10k lines vs 30-50ms without instancing
- **Memory**: Single quad geometry reused (minimal overhead)

### ⚠️ Limitations
1. **Line joins**: Native WebGL lines don't support joins; need custom shader logic
2. **Depth sorting**: Can't sort instanced lines per-frame (expensive)
3. **Variable widths**: Width stored per-instance but can't vary along line

---

## 5. Reference Implementations

### 🏆 Production-Ready Libraries

#### 1. **gpu-culling** (CodyJasonBennett)
- **GitHub**: https://github.com/CodyJasonBennett/gpu-culling
- **Tech**: WebGL 2 + custom frustum culling shaders
- **Use case**: Massive instanced mesh culling
- **Key feature**: Completely GPU-driven, zero CPU overhead after setup

#### 2. **Three.js Blocks - ComputeInstanceCulling**
- **URL**: https://www.threejs-blocks.com/docs/ComputeInstanceCulling
- **Tech**: WebGPU (modern browser feature)
- **Features**:
  - Frustum culling
  - LOD sampling (distance-based)
  - Atomic counter for visible count
  - Indirect draw args generation

#### 3. **Instanced Lines (wwwtyro)**
- **Blog**: https://wwwtyro.net/2019/11/18/instanced-lines.html
- **GitHub**: https://github.com/wwwtyro/instanced-lines-demos
- **Key feature**: Screen-space line rendering with proper joins/caps

#### 4. **WebGPU Instanced Lines (rreusser)**
- **GitHub**: https://github.com/rreusser/webgpu-instanced-lines
- **Tech**: WebGPU (modern, faster than WebGL)
- **Features**: Round/bevel joins, round/square caps

#### 5. **CAD-Viewer (mlightcad)**
- **GitHub**: https://github.com/mlightcad/cad-viewer
- **Specialization**: **DWG/DXF rendering** (directly relevant to your nesting tool)
- **Key techniques**:
  - **Batched geometry system** (merge similar primitives)
  - **Scene graph optimization** (AcTrScene)
  - **Dynamic layer rendering**
  - **Zero-backend (browser-only)**
  
  **Architecture insights**:
  ```typescript
  // From CAD-Viewer architecture
  // 1. Parse DWG/DXF
  // 2. Group entities by layer + color
  // 3. Batch similar primitives (lines, circles, arcs)
  // 4. Single draw call per batch
  // 5. Layer visibility controlled by instance visibility buffer
  ```

#### 6. **Autodesk Forge Viewer**
- **Tech**: Three.js based
- **Techniques**:
  - Fragment culling (depth pre-pass)
  - Progressive model loading
  - Custom shader materials
  - WebGL 2.0 support (deferred rendering)

### 📚 CAD Exchanger Web Toolkit
- **Blog**: https://cadexchanger.com/blog/
- **Key articles**:
  - "Enhancing rendering performance for B-rep representations"
  - "Complex drawing, BIM, and MCAD viewers examples"
- **Focus**: B-rep geometry optimization, layer management

---

## 6. Best Practices

### ✅ Do's
1. **Profile first**: Use Chrome DevTools GPU throttling + WebGL profiler
2. **Batch aggressively**: Merge geometries by layer/color/material
3. **Use frustum culling** for > 5k visible objects
4. **Cache LOD calculations** per camera frame
5. **Measure pixel size** (not distance) for LOD
6. **Use SharedArrayBuffer** for large geometry processing
7. **Test on lower-end devices**: Not all support WebGPU/modern features

### ❌ Don'ts
1. **Don't create geometry dynamically** in render loop
2. **Don't use individual meshes** for CAD entities (batch instead)
3. **Don't recreate LOD meshes** per frame
4. **Don't assume WebGPU support** (fallback to WebGL 2)
5. **Don't forget depth sorting** for transparent objects
6. **Don't share vertex data** between batches without duplication

### 🔧 Integration Checklist for VJP26 CAD Engine

```typescript
// 1. ✅ Implement GPU Culling
class CADFrustumCuller {
  private frustum = new THREE.Frustum();
  cullInstances(mesh: THREE.InstancedMesh, camera: THREE.Camera) {
    // ... implement
  }
}

// 2. ✅ Add Dynamic LOD for Polylines
class PolylineSimplifier {
  simplifyByPixelSize(polyline: Vector2[], pixelSize: number) {
    // ... implement douglasPeucker or similar
  }
}

// 3. ✅ Setup SharedArrayBuffer for DXF parsing
class DXFParserWorker {
  parseInWorker(dxfBuffer: SharedArrayBuffer) {
    // ... worker receives shared buffer
  }
}

// 4. ✅ Implement Instanced Line Rendering
class CADLineRenderer {
  addLinesFromLayer(layer: DXFLayer) {
    // ... batch into instanced geometry
  }
}
```

---

## 📖 Summary Table

| Technique | Benefit | Complexity | Best For | Gotchas |
|-----------|---------|-----------|----------|---------|
| **GPU Culling** | 20-50% draw call reduction | Medium | 5k+ objects | Bounding box accuracy |
| **Dynamic LOD** | 30-60% frame time improvement | Medium | Polylines, dense meshes | Popping artifacts |
| **SharedArrayBuffer** | 50-80% memory reduction | High | Large geometry processing | Security headers needed |
| **Instanced Lines** | 100-1000x faster line rendering | High | CAD line drawings | Complex joins/caps |
| **Geometry Batching** | 10x faster rendering | Low | DXF/DWG files | Memory overhead |

---

## 🎯 Recommended Implementation Order

1. **Phase 1**: Implement geometry batching (low complexity, high impact)
2. **Phase 2**: Add dynamic LOD for polylines (medium complexity, good impact)
3. **Phase 3**: GPU frustum culling (medium complexity, depends on scene size)
4. **Phase 4**: Instanced line rendering (high complexity, huge payoff for line-heavy CAD)
5. **Phase 5**: SharedArrayBuffer optimization (high complexity, best for large files)

---

## 🔗 Reference Links

- Three.js LOD: https://threejs.org/docs/index.html#api/en/objects/LOD
- WebGL Fundamentals - Instanced Drawing: https://webglfundamentals.org/webgl/lessons/webgl-instanced-drawing.html
- CAD-Viewer GitHub: https://github.com/mlightcad/cad-viewer
- Forge Viewer Custom Shaders: https://aps.autodesk.com/blog/forge-viewer-custom-shaders-part-1
- GPU Culling Demo: https://github.com/CodyJasonBennett/gpu-culling
