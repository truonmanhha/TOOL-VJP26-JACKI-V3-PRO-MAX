# Plan: AutoCAD-Inspired Nesting Engine Improvements

**Project**: VJP26 JACKI V3 — CNC Nesting Tool  
**Target**: Tab Nesting (NestingAX sub-app)  
**Created**: 2026-03-02  
**Stack**: React 18, TypeScript, Vite, Canvas 2D, No test framework  

---

## Goal

Cải thiện tab Nesting theo kiến trúc engine của AutoCAD (GSF):
- Rendering mượt 60fps dù có 1000+ entities
- UI không bao giờ bị block khi tính toán nesting
- UX professional: zoom-to-cursor, inertia pan, LOD, smooth interaction

---

## Scope

**IN:**
- Phase 1a: useRef optimization (zero-risk, highest-impact)
- Phase 1b: Canvas 2D rendering engine cho CAD entities
- Phase 2: Web Worker cho nesting algorithm
- Phase 3: UX enhancements (LOD, inertia, stats, spatial index)

**OUT (explicitly):**
- Refactor 940 dòng modal code (lines 5002–5945 trong NestingAXApp)
- Migrate sheets/parts DOM divs sang Canvas (Phase 1 only)
- WebGL / Three.js cho 2D workspace
- Replace toàn bộ useState bằng useRef
- Legacy `components/nesting/` system (giữ nguyên)
- Touch event support

---

## Architecture Target (Dual-Layer Approach)

```
┌─────────────────────────────────────────────────────┐
│  Modal DOM (z-index: 9999)  — KHÔNG THAY ĐỔI        │
├─────────────────────────────────────────────────────┤
│  SVG Overlay (z-index: 10)  — drawing previews,     │
│  snap indicators, selection handles, crosshair       │
├─────────────────────────────────────────────────────┤
│  DOM Divs (z-index: 5)      — sheets, placed parts  │
│  (giữ nguyên Phase 1, migrate sau)                  │
├─────────────────────────────────────────────────────┤
│  Canvas 2D (z-index: 1)     — CAD entities only     │
│  Path2D cache, dirty flag, rAF loop                 │
└─────────────────────────────────────────────────────┘
```

---

## Critical Guardrails

- **G1**: Tất cả 13 drawing tools (line, rect, circle, arc, ellipse, polygon, slot, obround, spline, polyline, dimension, measure, text) phải hoạt động chính xác sau migration
- **G2**: Sheet/part drag-and-drop không được thay đổi behavior
- **G3**: Nesting execution → visual placement coordinates phải đúng
- **G4**: Hit testing accuracy ±5px cho tất cả entity types
- **G5**: Window selection (drag-select) phải hoạt động
- **G6**: Y-axis flip (world Y-up → screen Y-down) phải được preserve
- **G7**: Tất cả modals phải clickable và positioned đúng
- **G8**: Zoom/pan behavior giữ nguyên (scroll=zoom, middle-click=pan)
- **G9**: Context menu / RadialMenu tại đúng world coordinates
- **G10**: DXF import → visual output identical với trước migration

---

## Performance Targets

- 500 entities + 5 sheets: **60fps**
- 1000 entities: **30fps minimum**
- Nesting computation: **không block UI** (Worker)
- Mouse move: **0 React re-renders** (useRef)
- Snap detection: **O(log n)** sau khi có R-Tree

---

## Phase 1a: useRef Optimization (LOWEST RISK — DO FIRST)

> **Rationale từ Metis**: Di chuyển mouse/zoom/pan state sang useRef có thể giải quyết 80% performance issues mà không cần Canvas migration. ĐO TRƯỚC, migrate sau.

### Task 1.1 — Profile Current Performance (MANDATORY FIRST)

**File**: `components/NestingAXApp.tsx`

**Steps**:
1. Mở Chrome DevTools Performance tab
2. Record session với 200 entities, pan + zoom + snap
3. Identify: % time in React reconciliation vs rendering vs JS computation
4. Note FPS counter và frame budget breakdown
5. Document baseline: "X fps at 200 entities, Y ms React reconcile per frame"

**Acceptance Criteria**:
- [ ] Baseline FPS documented cho 100 / 500 / 1000 entities
- [ ] Xác định được: bottleneck là React re-render hay rendering hay algorithm
- [ ] Screenshot Performance flame chart saved cho comparison

---

### Task 1.2 — Move Hot-Path State sang useRef

**File**: `components/NestingAXApp.tsx` (và `components/NestingAX/Workspace.tsx` nếu tồn tại)

**Tìm và xác định các state này**:
```typescript
// CẦN CHUYỂN sang useRef (không cần trigger re-render):
const [mouseScreenPos, setMouseScreenPos] = useState<{x:number,y:number}>()
const [mouseWorldPos, setMouseWorldPos] = useState<{x:number,y:number}>()
const [zoom, setZoom] = useState<number>()
const [viewOffset, setViewOffset] = useState<{x:number,y:number}>()
const [currentSnap, setCurrentSnap] = useState<...>()
```

**Thay bằng**:
```typescript
// Render-loop refs (NO re-render)
const zoomRef = useRef<number>(initialZoom)
const viewOffsetRef = useRef<{x:number,y:number}>(initialOffset)
const mouseScreenPosRef = useRef<{x:number,y:number}>({x:0,y:0})
const mouseWorldPosRef = useRef<{x:number,y:number}>({x:0,y:0})
const currentSnapRef = useRef<SnapResult|null>(null)

// Display mirrors (trigger re-render chỉ cho UI elements như Footer)
const [displayCoords, setDisplayCoords] = useState<{x:number,y:number}>({x:0,y:0})
const [displayZoom, setDisplayZoom] = useState<number>(initialZoom)
```

**Update pattern**:
```typescript
const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // Update refs IMMEDIATELY (no re-render)
  mouseScreenPosRef.current = { x: e.clientX, y: e.clientY }
  mouseWorldPosRef.current = screenToWorld(e.clientX, e.clientY)
  
  // Update display state DEBOUNCED (16ms — 1 frame)
  debouncedSetDisplayCoords({ x: mouseWorldPosRef.current.x, y: mouseWorldPosRef.current.y })
  
  // Mark dirty for render loop
  dirtyRef.current = true
}, [])
```

**Cập nhật consumers**:
- `Footer.tsx` — đọc `displayCoords` (state) thay vì `mouseWorldPos`
- Snap indicators — đọc từ `currentSnapRef` trong render loop
- Tất cả nơi dùng `zoom` / `viewOffset` trong render logic → dùng refs

**Helper function**:
```typescript
// Tạo debounce helper (không cần thư viện)
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  // implementation...
  return debounced
}
```

**QA Scenarios**:
- [ ] Footer hiển thị coordinates khi di chuột
- [ ] Zoom indicator trong UI cập nhật khi scroll
- [ ] Snap points hiển thị khi gần entity
- [ ] KHÔNG có thêm React re-renders (verify với React DevTools Profiler)

---

### Task 1.3 — Dirty Flag + rAF Render Loop

**File**: `components/NestingAXApp.tsx`

**Thêm render loop riêng biệt** (chỉ khi đã có Canvas — chuẩn bị cho Phase 1b):
```typescript
const dirtyRef = useRef(true)
const animFrameRef = useRef<number>()

useEffect(() => {
  const loop = () => {
    if (dirtyRef.current) {
      redrawCanvas() // Phase 1b: Canvas render
      dirtyRef.current = false
    }
    animFrameRef.current = requestAnimationFrame(loop)
  }
  animFrameRef.current = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(animFrameRef.current!)
}, [])
```

**Mark dirty khi**:
- `cadEntities` thay đổi
- `selectedEntities` thay đổi
- `zoom` / `viewOffset` thay đổi
- `drawState` thay đổi
- Mouse move (chỉ khi đang draw hoặc hover snap)

**QA Scenarios**:
- [ ] Canvas không redraw khi mouse move qua vùng trống (no dirty)
- [ ] Canvas redraw khi entity được thêm / xóa
- [ ] Canvas redraw khi pan / zoom

---

### Task 1.4 — Measure Performance After 1a

**Steps**:
1. Repeat Performance profiling từ Task 1.1
2. So sánh FPS, React reconcile time
3. Nếu đạt 60fps tại 500 entities → Phase 1b có thể defer
4. Nếu chưa đạt → proceed Phase 1b

**Decision gate**: Nếu useRef optimization giải quyết >80% vấn đề, **SKIP Phase 1b**, jump thẳng Phase 2.

**QA Scenarios**:
- [ ] FPS tăng đáng kể so với baseline
- [ ] React reconcile time giảm (DevTools Profiler)
- [ ] Không có behavior regression

---

## Phase 1b: Canvas 2D Rendering Engine (chỉ nếu cần sau 1a)

> **Chỉ thực hiện nếu Phase 1a không đủ**. Migrate CHỈ CAD entity rendering. Giữ nguyên: SVG overlays, DOM sheets/parts, modals.

### Task 1.5 — Kiểm tra tất cả worldToScreen/screenToWorld usages

**TRƯỚC KHI thay đổi bất cứ gì**, dùng AST grep để map toàn bộ:

```bash
# Tìm tất cả nơi dùng worldToScreen và screenToWorld
ast_grep pattern: 'worldToScreen($$$)'
ast_grep pattern: 'screenToWorld($$$)'
```

**Output cần thiết**: Danh sách đầy đủ file + line numbers. Đây là blast radius của coordinate system changes.

**QA Scenarios**:
- [ ] List đầy đủ được documented trong task notes

---

### Task 1.6 — Thêm Canvas Element vào Workspace

**File**: `components/NestingAXApp.tsx` (hoặc Workspace component)

**Thêm canvas BELOW SVG và DOM divs**:
```tsx
<div className="relative w-full h-full overflow-hidden">
  {/* Layer 1: Canvas (bottom) — CAD entities */}
  <canvas
    ref={canvasRef}
    className="absolute inset-0 w-full h-full"
    style={{ zIndex: 1 }}
    onMouseDown={handleCanvasMouseDown}
    onMouseMove={handleCanvasMouseMove}
    onMouseUp={handleCanvasMouseUp}
    onWheel={handleCanvasWheel}
    onContextMenu={handleCanvasContextMenu}
  />
  
  {/* Layer 2: DOM divs — sheets and placed parts (z-index: 5) */}
  <div className="absolute inset-0" style={{ zIndex: 5, pointerEvents: 'none' }}>
    {renderSheetsAndParts()}
  </div>
  
  {/* Layer 3: SVG overlay — drawing previews, snap, selection (z-index: 10) */}
  <svg
    className="absolute inset-0 w-full h-full"
    style={{ zIndex: 10, pointerEvents: 'none' }}
  >
    {renderDrawingPreview()}
    {renderSnapIndicators()}
    {renderSelectionBox()}
  </svg>
  
  {/* Layer 4: Modals (z-index: 9999) — UNCHANGED */}
  {renderModals()}
</div>
```

**HiDPI handling** (MANDATORY):
```typescript
const initCanvas = (canvas: HTMLCanvasElement) => {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  // Store logical size (CSS pixels)
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
}
```

**QA Scenarios**:
- [ ] Canvas visible và đúng kích thước trong viewport
- [ ] Canvas sắc nét trên Retina/HiDPI display (không bị blur)
- [ ] SVG overlay vẫn clickable cho drawing tools
- [ ] Modals vẫn hiển thị đúng và clickable
- [ ] Sheet DOM divs vẫn visible

---

### Task 1.7 — Canvas Coordinate Transform (Y-axis flip)

**File**: `components/NestingAXApp.tsx`

**Implement AutoCAD-style retained transform**:
```typescript
const applyViewportTransform = (ctx: CanvasRenderingContext2D) => {
  ctx.setTransform(
    zoomRef.current,                    // scaleX
    0,                                   // skewX
    0,                                   // skewY
    -zoomRef.current,                   // scaleY (NEGATIVE = Y-flip, world Y-up)
    viewOffsetRef.current.x,            // translateX
    viewOffsetRef.current.y             // translateY
  )
}
```

**World-to-Canvas** (sau khi applyViewportTransform):
```typescript
// Các entity chỉ cần dùng world coordinates trực tiếp
// Canvas transform tự lo scale + Y-flip
ctx.moveTo(entity.x1, entity.y1)
ctx.lineTo(entity.x2, entity.y2)
// KHÔNG cần gọi worldToScreen() nữa trong Canvas render path
```

**ĐỒNG THỜI**, SVG overlay và DOM sheets vẫn dùng `worldToScreen()` cũ — PHẢI cho kết quả IDENTICAL.

**Validation test** (MANDATORY):
```typescript
// Tạo entity tại (100, 200) world
// Canvas transform phải cho ra cùng screen coords với worldToScreen(100, 200)
const canvasPoint = ctx.getTransform().transformPoint(new DOMPoint(100, 200))
const svgPoint = worldToScreen(100, 200)
console.assert(Math.abs(canvasPoint.x - svgPoint.x) < 0.001)
console.assert(Math.abs(canvasPoint.y - svgPoint.y) < 0.001)
```

**QA Scenarios**:
- [ ] Entity drawn at world (0,0) khớp với origin của SVG overlay
- [ ] Entity drawn at world (100,100) khớp với SVG tại cùng position
- [ ] Sau zoom, entity positions vẫn khớp giữa Canvas và SVG
- [ ] Sau pan, entity positions vẫn khớp

---

### Task 1.8 — Path2D Cache System

**File**: `components/NestingAXApp.tsx` (hoặc extract `renderEngine.ts`)

**Implement entity path cache**:
```typescript
// Cache: entity.id → Path2D (world coordinates)
const pathCacheRef = useRef<Map<string, Path2D>>(new Map())

const getEntityPath = (entity: CADEntity): Path2D => {
  const cached = pathCacheRef.current.get(entity.id)
  if (cached) return cached
  
  const path = buildEntityPath(entity) // build Path2D in world coords
  pathCacheRef.current.set(entity.id, path)
  return path
}

// Invalidation: chỉ khi entity thay đổi
const invalidateEntityCache = (entityId: string) => {
  pathCacheRef.current.delete(entityId)
}

const invalidateAllCache = () => {
  pathCacheRef.current.clear()
}
```

**buildEntityPath** cho mỗi entity type:
```typescript
const buildEntityPath = (entity: CADEntity): Path2D => {
  const path = new Path2D()
  switch (entity.type) {
    case 'line':
      path.moveTo(entity.x1, entity.y1)
      path.lineTo(entity.x2, entity.y2)
      break
    case 'circle':
      // NOTE: Y-flip handled by canvas transform, KHÔNG cần flip ở đây
      path.arc(entity.cx, entity.cy, entity.radius, 0, Math.PI * 2)
      break
    case 'arc':
      // Điều chỉnh angles cho Y-flip
      path.arc(entity.cx, entity.cy, entity.radius, 
               -entity.endAngle * Math.PI/180,  // flip direction
               -entity.startAngle * Math.PI/180,
               true) // counterclockwise trong world = clockwise trên screen với Y-flip
      break
    case 'polyline':
    case 'polygon':
      entity.points.forEach((pt, i) => {
        if (i === 0) path.moveTo(pt.x, pt.y)
        else path.lineTo(pt.x, pt.y)
      })
      if (entity.closed) path.closePath()
      break
    case 'rect':
      // NOTE: rect với Y-flip cần xử lý đặc biệt
      path.rect(entity.x, entity.y - entity.height, entity.width, entity.height)
      break
    case 'ellipse':
      path.ellipse(entity.cx, entity.cy, entity.rx, entity.ry,
                   -entity.rotation, 0, Math.PI * 2)
      break
    // Edge cases:
    case 'text':
    case 'dimension':
    case 'leader':
      // Render trên Canvas riêng (xem Task 1.10)
      return new Path2D() // empty path, text drawn separately
  }
  return path
}
```

**Invalidation triggers** (đặt trong các handlers):
```typescript
// Khi entity bị edit/move
const handleEntityEdit = (entityId: string) => {
  invalidateEntityCache(entityId)
  dirtyRef.current = true
}

// Khi load DXF mới
const handleDxfImport = () => {
  invalidateAllCache()
  dirtyRef.current = true
}
```

**QA Scenarios**:
- [ ] Mỗi entity type (line, circle, arc, polyline, polygon, ellipse, rect) render đúng
- [ ] Sau khi move entity → shape cập nhật (cache invalidated)
- [ ] Circle radius 0 không crash (guard: `if (entity.radius <= 0) return new Path2D()`)
- [ ] Zero-length line không crash
- [ ] Arc với start==end angle render full circle (not nothing)

---

### Task 1.9 — Main Render Loop

**File**: `components/NestingAXApp.tsx`

**Implement main Canvas render function**:
```typescript
const redrawCanvas = useCallback(() => {
  const canvas = canvasRef.current
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  
  // 1. Clear
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0) // reset to identity
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
  ctx.restore()
  
  // 2. Apply viewport transform (Y-flip + zoom + pan)
  applyViewportTransform(ctx)
  
  // 3. Viewport culling: compute visible world rect
  const visibleRect = getVisibleWorldRect(canvas, zoomRef.current, viewOffsetRef.current)
  
  // 4. Render layers (back to front)
  renderGrid(ctx, visibleRect)           // optional grid
  renderEntities(ctx, visibleRect)       // CAD entities (culled)
  renderSelectedHighlights(ctx)          // selection overlay
  renderSnapIndicatorOnCanvas(ctx)       // snap point marker
  
  // NOTE: Text, dimensions, leaders rendered separately after transform reset
  ctx.restore()
  renderTextEntities(ctx)                // screen-space text
  
}, [cadEntities, selectedEntities])

const renderEntities = (ctx: CanvasRenderingContext2D, visibleRect: Rect) => {
  for (const entity of cadEntities) {
    // Frustum culling: skip entities outside visible rect
    if (!entityOverlapsRect(entity, visibleRect)) continue
    
    const path = getEntityPath(entity)
    const isSelected = selectedEntities.has(entity.id)
    
    ctx.beginPath()
    // Stroke style
    ctx.strokeStyle = isSelected ? '#00aaff' : (entity.color || '#00ff88')
    ctx.lineWidth = (entity.lineWidth || 1) / zoomRef.current // screen-space line width
    ctx.stroke(path)
    
    // Fill nếu entity có fill (polygon, rect với fill)
    if (entity.fill) {
      ctx.fillStyle = entity.fillColor || 'rgba(0,255,136,0.15)'
      ctx.fill(path)
    }
  }
}
```

**Viewport culling helper**:
```typescript
const getVisibleWorldRect = (canvas: HTMLCanvasElement, zoom: number, offset: Vec2): Rect => {
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  return {
    minX: (-offset.x) / zoom,
    maxX: (w - offset.x) / zoom,
    // Y-flip: screen top = world max Y
    minY: (offset.y - h) / zoom,
    maxY: offset.y / zoom,
  }
}

const entityOverlapsRect = (entity: CADEntity, rect: Rect): boolean => {
  const bbox = getEntityBoundingBox(entity)
  return !(bbox.maxX < rect.minX || bbox.minX > rect.maxX ||
           bbox.maxY < rect.minY || bbox.minY > rect.maxY)
}
```

**QA Scenarios**:
- [ ] Tất cả entities visible trong viewport được render
- [ ] Entities ngoài viewport KHÔNG được render (verify với console.count)
- [ ] FPS đạt target sau culling
- [ ] Selected entities highlight màu khác
- [ ] Line width không thay đổi theo zoom (screen-space constant width)

---

### Task 1.10 — Text & Annotation Rendering trên Canvas

**File**: `components/NestingAXApp.tsx`

**Quyết định từ Metis**: Text entities cần xử lý đặc biệt vì Canvas text khác SVG text.

**Strategy**: Reset transform về screen-space để render text:
```typescript
const renderTextEntities = (ctx: CanvasRenderingContext2D) => {
  // Reset to identity (screen coords)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  
  for (const entity of cadEntities.filter(e => e.type === 'text')) {
    // Convert world pos to screen pos
    const screenPos = worldToScreen(entity.x, entity.y)
    
    ctx.font = `${entity.fontSize || 12}px "Arial", sans-serif`
    ctx.fillStyle = entity.color || '#00ff88'
    ctx.textAlign = entity.anchor || 'left'
    ctx.fillText(entity.content, screenPos.x, screenPos.y)
  }
  
  ctx.restore()
}
```

**Dimension arrows** (không có SVG `<marker>` equivalent):
```typescript
const drawArrowHead = (ctx: CanvasRenderingContext2D, tip: Vec2, direction: number) => {
  const arrowSize = 8 / zoomRef.current // screen-space constant size
  ctx.save()
  ctx.translate(tip.x, tip.y)
  ctx.rotate(direction)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-arrowSize, arrowSize / 2)
  ctx.lineTo(-arrowSize, -arrowSize / 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
```

**QA Scenarios**:
- [ ] Text entities hiển thị đúng vị trí tại mọi zoom level
- [ ] Text không bị flip (Y-axis flip không ảnh hưởng text)
- [ ] Vietnamese characters hiển thị đúng
- [ ] Dimension arrows render đúng hướng
- [ ] Leader lines kết nối đúng với annotation

---

### Task 1.11 — Canvas Hit Testing

**File**: `components/NestingAXApp.tsx`

**Thay thế O(N) linear search bằng Path2D hit testing**:
```typescript
const findEntityAtPoint = (screenX: number, screenY: number): CADEntity | null => {
  const canvas = canvasRef.current
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return null
  
  // Apply viewport transform để hit test dùng world coords
  ctx.save()
  applyViewportTransform(ctx)
  
  // Tolerance: 5px trong screen space = 5/zoom trong world space
  const tolerance = 5 / zoomRef.current
  
  // Tìm entity (iterate backwards = top entity first)
  let found: CADEntity | null = null
  for (let i = cadEntities.length - 1; i >= 0; i--) {
    const entity = cadEntities[i]
    const path = getEntityPath(entity)
    
    ctx.lineWidth = tolerance * 2 // isPointInStroke dùng lineWidth làm tolerance
    if (ctx.isPointInStroke(path, screenX, screenY) || 
        ctx.isPointInPath(path, screenX, screenY)) {
      found = entity
      break
    }
  }
  
  ctx.restore()
  return found
}
```

**Edge cases cần handle**:
- Arc hit testing: `isPointInStroke` cho arc → reliable
- Text hit testing: manual bounding box check (ctx.measureText)
- Dimension hit testing: check toàn bộ dimension geometry
- Zero-size entities: skip nếu bounding box < 1px

**QA Scenarios**:
- [ ] Click trên line (thin 1px) → entity được select
- [ ] Click trên circle → entity được select  
- [ ] Click trên arc → entity được select
- [ ] Click trên text → entity được select
- [ ] Click trên empty space → deselect
- [ ] Click tại intersection của 2 entities → entity vẽ sau (trên z-order) được select

---

### Task 1.12 — Hatch Pattern Rendering

**File**: `components/NestingAXApp.tsx`

**Metis note**: SVG `<pattern>` không có Canvas equivalent. Strategy: vẽ hatch lines thủ công.

```typescript
const renderHatch = (ctx: CanvasRenderingContext2D, entity: HatchEntity) => {
  if (!entity.boundary || !entity.boundary.length) return
  
  ctx.save()
  
  // 1. Clip to boundary
  const clipPath = new Path2D()
  entity.boundary.forEach((pt, i) => {
    if (i === 0) clipPath.moveTo(pt.x, pt.y)
    else clipPath.lineTo(pt.x, pt.y)
  })
  clipPath.closePath()
  ctx.clip(clipPath)
  
  // 2. Draw hatch lines within clipped area
  const bbox = getEntityBoundingBox(entity)
  const spacing = entity.hatchSpacing || 5
  const angle = (entity.hatchAngle || 45) * Math.PI / 180
  
  // Generate lines covering bbox area
  const diagonal = Math.sqrt(
    Math.pow(bbox.maxX - bbox.minX, 2) + 
    Math.pow(bbox.maxY - bbox.minY, 2)
  )
  
  ctx.strokeStyle = entity.color || '#00ff88'
  ctx.lineWidth = 0.5 / zoomRef.current
  
  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2
  
  for (let d = -diagonal; d <= diagonal; d += spacing) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    ctx.beginPath()
    ctx.moveTo(cx + d * (-sin) - diagonal * cos, cy + d * cos - diagonal * sin)
    ctx.lineTo(cx + d * (-sin) + diagonal * cos, cy + d * cos + diagonal * sin)
    ctx.stroke()
  }
  
  ctx.restore()
}
```

**QA Scenarios**:
- [ ] Hatch pattern render trong boundary
- [ ] Hatch không leak ngoài boundary
- [ ] Hatch angle đúng (45°, 90°, etc.)
- [ ] Hatch spacing đúng tỷ lệ

---

## Phase 2: Web Worker cho Nesting Algorithm

> **TRƯỚC KHI implement**: Đo thời gian nesting execution cho 10, 30, 50 parts. Nếu <200ms → có thể defer Worker. Nếu >500ms → Worker là mandatory.

### Task 2.1 — Đo Performance của Nesting Algorithm

**Steps**:
1. Thêm `console.time('nesting')` / `console.timeEnd('nesting')` vào `NestingAX/services/nesting.ts`
2. Chạy với: 10 parts, 30 parts, 50 parts, 100 parts
3. Ghi lại thời gian
4. Kiểm tra `services/nesting/geneticNesting.ts` có được gọi không trong NestingAX flow

**Decision gate**: 
- <200ms tổng: Defer Worker
- 200ms–500ms: Optional Worker
- >500ms: Mandatory Worker

**QA Scenarios**:
- [ ] Timing data documented cho 10/30/50/100 parts

---

### Task 2.2 — Tạo Nesting Web Worker

**File**: `workers/nesting.worker.ts` (NEW FILE — theo pattern của `workers/gcode.worker.ts`)

**Message protocol** (theo pattern hiện có):
```typescript
// Inbound messages (main → worker)
type NestingWorkerInput = 
  | { type: 'start'; payload: NestingInput }
  | { type: 'cancel' }

// Outbound messages (worker → main)
type NestingWorkerOutput =
  | { type: 'progress'; payload: { percent: number; message: string } }
  | { type: 'complete'; payload: NestingResult }
  | { type: 'error'; payload: { message: string } }

// Worker implementation
self.onmessage = (e: MessageEvent<NestingWorkerInput>) => {
  const { type, payload } = e.data
  
  if (type === 'cancel') {
    cancelled = true
    return
  }
  
  if (type === 'start') {
    cancelled = false
    runNesting(payload)
  }
}

let cancelled = false

async function runNesting(input: NestingInput) {
  try {
    // Progress callback
    const onProgress = (percent: number, message: string) => {
      if (cancelled) throw new Error('Cancelled')
      self.postMessage({ type: 'progress', payload: { percent, message } })
    }
    
    // Run algorithm (MaxRects hoặc Genetic tùy input.method)
    const result = await runNestingAlgorithm(input, onProgress)
    
    if (!cancelled) {
      self.postMessage({ type: 'complete', payload: result })
    }
  } catch (err) {
    if (!cancelled) {
      self.postMessage({ type: 'error', payload: { message: String(err) } })
    }
  }
}
```

**Import algorithms** (Worker chỉ import algorithm functions, KHÔNG import React):
```typescript
// worker KHÔNG được import: React, useState, useEffect, any DOM API
// Worker CÓ THỂ import: pure JS/TS modules
import { MaxRectsBinPack } from '../services/nestingService'
import { AdvancedNestingEngine } from '../services/nesting/index'
```

**QA Scenarios**:
- [ ] Worker khởi động không lỗi
- [ ] Worker nhận input và trả progress updates
- [ ] Worker trả complete với correct result
- [ ] Cancel message dừng computation
- [ ] Worker không crash khi nhận invalid input

---

### Task 2.3 — Integrate Worker vào NestingAXApp

**File**: `components/NestingAX/services/nesting.ts` hoặc `NestingAXApp.tsx`

**Replace synchronous call với Worker**:
```typescript
const nestingWorkerRef = useRef<Worker | null>(null)

const startNesting = useCallback((input: NestingInput) => {
  // Terminate existing worker nếu đang chạy
  nestingWorkerRef.current?.terminate()
  
  // Khởi tạo worker mới
  nestingWorkerRef.current = new Worker(
    new URL('../workers/nesting.worker.ts', import.meta.url),
    { type: 'module' }
  )
  
  setNestingStatus('running')
  setNestingProgress(0)
  
  nestingWorkerRef.current.onmessage = (e: MessageEvent<NestingWorkerOutput>) => {
    const { type, payload } = e.data
    
    if (type === 'progress') {
      setNestingProgress(payload.percent)
      setNestingMessage(payload.message)
    }
    else if (type === 'complete') {
      setNestingResult(payload)
      setNestingStatus('done')
      dirtyRef.current = true // trigger canvas redraw
    }
    else if (type === 'error') {
      setNestingStatus('error')
      setNestingError(payload.message)
    }
  }
  
  nestingWorkerRef.current.postMessage({ type: 'start', payload: input })
}, [])

const cancelNesting = useCallback(() => {
  nestingWorkerRef.current?.postMessage({ type: 'cancel' })
  nestingWorkerRef.current?.terminate()
  nestingWorkerRef.current = null
  setNestingStatus('idle')
}, [])

// Cleanup
useEffect(() => {
  return () => {
    nestingWorkerRef.current?.terminate()
  }
}, [])
```

**QA Scenarios**:
- [ ] Bắt đầu nesting → progress bar cập nhật
- [ ] Trong khi nesting chạy → pan/zoom workspace vẫn mượt
- [ ] Nesting hoàn thành → parts hiển thị trên sheets
- [ ] Cancel button dừng nesting ngay
- [ ] Close tab khi nesting đang chạy → worker terminated (no leak)
- [ ] Bắt đầu nesting lần 2 khi lần 1 chưa xong → lần 1 bị terminate

---

### Task 2.4 — Progress UI trong PerformingNest Overlay

**File**: `components/NestingAXApp.tsx` (phần PerformingNest UI)

**Đảm bảo progress updates flow đúng**:
```typescript
// State cho progress UI
const [nestingStatus, setNestingStatus] = useState<'idle'|'running'|'done'|'error'>('idle')
const [nestingProgress, setNestingProgress] = useState(0)
const [nestingMessage, setNestingMessage] = useState('')
```

**Progress bar component** (update existing hoặc enhance):
```tsx
{nestingStatus === 'running' && (
  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
    <div className="glass-panel p-6 rounded-xl min-w-80">
      <div className="text-emerald-400 font-bold mb-2">⚙️ Đang tính toán nesting...</div>
      <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
        <div 
          className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${nestingProgress}%` }}
        />
      </div>
      <div className="text-slate-400 text-sm">{nestingMessage}</div>
      <button 
        onClick={cancelNesting}
        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm"
      >
        Hủy
      </button>
    </div>
  </div>
)}
```

**QA Scenarios**:
- [ ] Overlay hiển thị khi nesting bắt đầu
- [ ] Progress bar tăng theo thời gian
- [ ] Message text cập nhật theo algorithm phase
- [ ] Cancel button visible và hoạt động
- [ ] Overlay biến mất khi nesting xong

---

## Phase 3: UX Enhancements (AutoCAD-inspired)

### Task 3.1 — Interactivity Mode (Dynamic LOD)

**Inspired by AutoCAD's beginInteractivityMode()**

**File**: `components/NestingAXApp.tsx`

```typescript
// Motion detection
const isMovingRef = useRef(false)
const motionEndTimerRef = useRef<ReturnType<typeof setTimeout>>()
const LOD_THRESHOLD = 200 // entities để trigger LOD

const handleMotionStart = () => {
  if (cadEntities.length > LOD_THRESHOLD) {
    isMovingRef.current = true
    dirtyRef.current = true
  }
}

const handleMotionEnd = () => {
  clearTimeout(motionEndTimerRef.current)
  motionEndTimerRef.current = setTimeout(() => {
    isMovingRef.current = false
    dirtyRef.current = true // trigger full quality redraw
  }, 150) // 150ms sau khi dừng chuyển động
}
```

**LOD rendering trong render loop**:
```typescript
const renderEntities = (ctx: CanvasRenderingContext2D, visibleRect: Rect) => {
  const isLOD = isMovingRef.current && cadEntities.length > LOD_THRESHOLD
  
  for (const entity of cadEntities) {
    if (!entityOverlapsRect(entity, visibleRect)) continue
    
    if (isLOD) {
      // LOD mode: vẽ bounding box thay vì full geometry (như AutoCAD)
      renderEntityBoundingBox(ctx, entity)
    } else {
      // Full quality mode
      const path = getEntityPath(entity)
      ctx.stroke(path)
    }
  }
}

const renderEntityBoundingBox = (ctx: CanvasRenderingContext2D, entity: CADEntity) => {
  const bbox = getEntityBoundingBox(entity)
  ctx.strokeStyle = entity.color || '#00ff88'
  ctx.lineWidth = 1 / zoomRef.current
  ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY)
}
```

**Trigger motion events**:
```typescript
// Trong pan/zoom handlers
const handleWheel = (e: WheelEvent) => {
  handleMotionStart()
  // ... zoom logic
  handleMotionEnd()
}

const handlePan = () => {
  if (!isPanning) return
  handleMotionStart()
  // ... pan logic
  // handleMotionEnd() called on mouseUp/touchEnd
}
```

**QA Scenarios**:
- [ ] Khi có >200 entities và zoom/pan → bounding boxes hiển thị thay geometry
- [ ] 150ms sau khi dừng chuyển động → full geometry render lại
- [ ] Khi <200 entities → KHÔNG có LOD (full quality always)
- [ ] Text entities KHÔNG render trong LOD mode (giống AutoCAD drop text khi motion)
- [ ] Hatch KHÔNG render trong LOD mode

---

### Task 3.2 — Zoom-to-Cursor

**File**: `components/NestingAXApp.tsx`

**Thay thế current zoom behavior**:
```typescript
const handleWheel = useCallback((e: WheelEvent) => {
  e.preventDefault()
  
  const canvas = canvasRef.current
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left  // screen coords relative to canvas
  const mouseY = e.clientY - rect.top
  
  // World position dưới cursor TRƯỚC zoom
  const worldX = (mouseX - viewOffsetRef.current.x) / zoomRef.current
  const worldY = -(mouseY - viewOffsetRef.current.y) / zoomRef.current // Y-flip
  
  // Zoom factor
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.01, Math.min(1000, zoomRef.current * delta))
  
  // Adjust offset để world point dưới cursor KHÔNG di chuyển
  // screenX = worldX * zoom + offsetX → offsetX = screenX - worldX * zoom
  viewOffsetRef.current = {
    x: mouseX - worldX * newZoom,
    y: mouseY + worldY * newZoom  // Y-flip: worldY flipped back
  }
  zoomRef.current = newZoom
  
  // Cập nhật display state (debounced)
  setDisplayZoom(newZoom)
  
  handleMotionStart()
  handleMotionEnd()
  dirtyRef.current = true
}, [])
```

**QA Scenarios**:
- [ ] Scroll wheel up → zoom in, điểm dưới cursor KHÔNG di chuyển
- [ ] Scroll wheel down → zoom out, điểm dưới cursor KHÔNG di chuyển
- [ ] Zoom đến min (0.01) → không thể zoom out thêm
- [ ] Zoom đến max (1000) → không thể zoom in thêm
- [ ] Zoom indicator trong Footer cập nhật

---

### Task 3.3 — Inertia Panning

**File**: `components/NestingAXApp.tsx`

**Physics-based pan với momentum**:
```typescript
// Velocity tracking
const velocityRef = useRef({ x: 0, y: 0 })
const lastPanPosRef = useRef({ x: 0, y: 0 })
const lastPanTimeRef = useRef(0)
const inertiaFrameRef = useRef<number>()

const handlePanMove = (screenX: number, screenY: number) => {
  if (!isPanning) return
  
  const now = performance.now()
  const dt = now - lastPanTimeRef.current
  
  const dx = screenX - lastPanPosRef.current.x
  const dy = screenY - lastPanPosRef.current.y
  
  // Update velocity (pixels/ms)
  if (dt > 0) {
    velocityRef.current = { x: dx / dt, y: dy / dt }
  }
  
  viewOffsetRef.current = {
    x: viewOffsetRef.current.x + dx,
    y: viewOffsetRef.current.y + dy,
  }
  
  lastPanPosRef.current = { x: screenX, y: screenY }
  lastPanTimeRef.current = now
  dirtyRef.current = true
}

const handlePanEnd = () => {
  setIsPanning(false)
  
  // Start inertia if velocity significant
  const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2)
  if (speed > 0.1) {
    startInertia()
  }
}

const startInertia = () => {
  const FRICTION = 0.95 // 5% velocity loss per frame
  const MIN_SPEED = 0.01
  
  const tick = () => {
    velocityRef.current.x *= FRICTION
    velocityRef.current.y *= FRICTION
    
    viewOffsetRef.current.x += velocityRef.current.x * 16 // assume 16ms/frame
    viewOffsetRef.current.y += velocityRef.current.y * 16
    
    dirtyRef.current = true
    
    const speed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2)
    if (speed > MIN_SPEED) {
      inertiaFrameRef.current = requestAnimationFrame(tick)
    }
  }
  
  inertiaFrameRef.current = requestAnimationFrame(tick)
}

// Cleanup inertia
useEffect(() => {
  return () => {
    if (inertiaFrameRef.current) cancelAnimationFrame(inertiaFrameRef.current)
  }
}, [])
```

**QA Scenarios**:
- [ ] Flick pan → canvas tiếp tục di chuyển sau khi thả chuột
- [ ] Inertia giảm dần tự nhiên (FRICTION=0.95)
- [ ] Click trong khi inertia → inertia dừng ngay
- [ ] Inertia cleanup khi component unmount

---

### Task 3.4 — Canvas-Based Part Previews (NestingResults)

**File**: `components/nesting/NestingResults.tsx` hoặc `components/NestingAX/Sidebar.tsx`

**Thay DOM div previews bằng Canvas**:
```tsx
// TRƯỚC: DOM divs (layout thrash)
const PartPreviewDOM = ({ part }: { part: NestingPart }) => (
  <div className="relative" style={{ width: 80, height: 80 }}>
    {part.geometry?.map((pt, i) => (
      <div key={i} style={{ position: 'absolute', left: pt.x, top: pt.y, ... }} />
    ))}
  </div>
)

// SAU: Canvas (single draw call)
const PartPreviewCanvas: React.FC<{ part: NestingPart; size?: number }> = ({ 
  part, 
  size = 80 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !part.geometry?.length) return
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    
    // Compute bounds
    const xs = part.geometry.map(p => p.x)
    const ys = part.geometry.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const geoW = maxX - minX, geoH = maxY - minY
    
    // Scale to fit with padding
    const padding = 4
    const scaleX = (size - padding * 2) / geoW
    const scaleY = (size - padding * 2) / geoH
    const scale = Math.min(scaleX, scaleY)
    
    ctx.clearRect(0, 0, size, size)
    
    // Center transform
    ctx.save()
    ctx.translate(
      padding + (size - padding * 2 - geoW * scale) / 2 - minX * scale,
      padding + (size - padding * 2 - geoH * scale) / 2 + maxY * scale  // Y-flip
    )
    ctx.scale(scale, -scale)  // Y-flip
    
    // Draw geometry
    ctx.beginPath()
    part.geometry.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.closePath()
    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 1 / scale
    ctx.stroke()
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)'
    ctx.fill()
    
    ctx.restore()
    
    // Part name overlay
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(part.name || 'Part', size / 2, size - 2)
    
  }, [part, size])
  
  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded border border-slate-700"
    />
  )
}
```

**QA Scenarios**:
- [ ] Part preview hiển thị đúng hình dạng
- [ ] Preview scale-to-fit trong size × size box
- [ ] Preview sắc nét trên Retina display
- [ ] 100 previews render không gây layout thrash (measure với DevTools)
- [ ] Part name hiển thị bên dưới preview

---

### Task 3.5 — Better Selection & Hover Feedback

**File**: `components/NestingAXApp.tsx`

**Hover highlight** (không cần re-render):
```typescript
const hoverEntityRef = useRef<string | null>(null)

const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // ... existing mouse move logic
  
  const hovered = findEntityAtPoint(e.clientX, e.clientY)
  const newHoverId = hovered?.id || null
  
  if (newHoverId !== hoverEntityRef.current) {
    hoverEntityRef.current = newHoverId
    dirtyRef.current = true // trigger redraw cho hover highlight
  }
}, [])
```

**Trong render loop**:
```typescript
const renderEntities = (ctx: CanvasRenderingContext2D) => {
  for (const entity of cadEntities) {
    const isSelected = selectedEntityIds.has(entity.id)
    const isHovered = entity.id === hoverEntityRef.current
    
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'    // blue-500
      ctx.lineWidth = 2 / zoomRef.current
    } else if (isHovered) {
      ctx.strokeStyle = '#60a5fa'    // blue-400 (lighter)
      ctx.lineWidth = 1.5 / zoomRef.current
    } else {
      ctx.strokeStyle = entity.color || '#00ff88'
      ctx.lineWidth = (entity.lineWidth || 1) / zoomRef.current
    }
    
    ctx.stroke(getEntityPath(entity))
  }
}
```

**Selection rectangle** (SVG overlay — giữ pattern hiện tại):
```tsx
{isWindowSelecting && selectionBox && (
  <rect
    x={Math.min(selectionBox.x1, selectionBox.x2)}
    y={Math.min(selectionBox.y1, selectionBox.y2)}
    width={Math.abs(selectionBox.x2 - selectionBox.x1)}
    height={Math.abs(selectionBox.y2 - selectionBox.y1)}
    fill="rgba(59, 130, 246, 0.1)"
    stroke="#3b82f6"
    strokeWidth="1"
    strokeDasharray="4 2"
  />
)}
```

**Selection handles** (endpoint dots cho selected entities):
```typescript
const renderSelectionHandles = (ctx: CanvasRenderingContext2D) => {
  for (const entityId of selectedEntityIds) {
    const entity = cadEntitiesMap.get(entityId)
    if (!entity) continue
    
    const endpoints = getEntityEndpoints(entity)
    
    ctx.fillStyle = '#3b82f6'
    for (const pt of endpoints) {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 4 / zoomRef.current, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
```

**QA Scenarios**:
- [ ] Hover entity → highlight màu xanh nhạt ngay lập tức
- [ ] Click entity → highlight đậm, selection handles xuất hiện ở endpoints
- [ ] Multi-select với Shift+click → nhiều entities highlighted
- [ ] Window select → selection rectangle với dashed border
- [ ] Deselect khi click empty space

---

### Task 3.6 — Visual Stats Overlay

**File**: `components/NestingAXApp.tsx`

**Stats panel được overlay trên Workspace** (không blocking):
```tsx
{nestingResult && (
  <div className="absolute top-4 right-4 glass-panel p-3 rounded-xl z-20 min-w-48">
    {/* Efficiency gauge */}
    <div className="flex items-center gap-2 mb-2">
      <div className="text-slate-400 text-xs">Hiệu suất</div>
      <div className="flex-1 bg-slate-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${nestingResult.efficiency}%`,
            backgroundColor: nestingResult.efficiency > 80 ? '#10b981' 
                           : nestingResult.efficiency > 60 ? '#f59e0b' 
                           : '#ef4444'
          }}
        />
      </div>
      <div className="text-emerald-400 text-xs font-bold">
        {nestingResult.efficiency.toFixed(1)}%
      </div>
    </div>
    
    {/* Sheet utilization per sheet */}
    {nestingResult.sheets.map((sheet, i) => (
      <div key={i} className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Sheet {i + 1}</span>
        <span className="text-slate-300">{sheet.utilization?.toFixed(1)}%</span>
      </div>
    ))}
    
    {/* Waste visualization */}
    <div className="mt-2 border-t border-slate-700 pt-2">
      <div className="text-slate-400 text-xs">Phế liệu</div>
      <div className="text-slate-300 text-sm font-mono">
        {((100 - nestingResult.efficiency) * totalArea / 100).toFixed(0)} mm²
      </div>
    </div>
    
    {/* Part counts */}
    <div className="flex justify-between text-xs text-slate-400 mt-1">
      <span>Đã đặt</span>
      <span className="text-emerald-400">{nestingResult.placedCount}/{nestingResult.totalCount}</span>
    </div>
  </div>
)}
```

**QA Scenarios**:
- [ ] Stats overlay hiển thị sau khi nesting hoàn thành
- [ ] Efficiency % đúng (so với giá trị trong NestingResult)
- [ ] Màu efficiency bar thay đổi theo threshold (green/yellow/red)
- [ ] Waste area tính đúng
- [ ] Overlay không che Drawing tools quan trọng
- [ ] Có thể collapse/hide overlay

---

## Phase Final: Verification Wave

### Visual Regression Tests

```typescript
// Test matrix — chạy sau khi hoàn thành tất cả phases:

// Test 1: Entity rendering
// Action: Tạo 1 entity mỗi loại, screenshot
// Expected: Visual identical với SVG render trước migration

// Test 2: Coordinate accuracy
// Action: Tạo entity tại (0,0), (100,0), (0,100), (100,100)
// Action: Click trên từng entity
// Expected: Đúng entity được select

// Test 3: Zoom accuracy
// Action: Zoom in 10x vào điểm (50,50)
// Expected: Điểm (50,50) vẫn ở center của viewport

// Test 4: Nesting Worker
// Action: Chạy nesting với 50 parts, measure UI FPS trong khi chạy
// Expected: FPS > 30 trong khi nesting chạy

// Test 5: Performance
// Action: Tạo 500 entities, measure FPS
// Expected: FPS >= 60

// Test 6: LOD
// Action: 250 entities, pan nhanh
// Expected: Bounding boxes hiển thị trong motion, full geometry sau khi dừng

// Test 7: DXF import
// Action: Import DXF file đã biết
// Expected: Visual identical với before (DXF geometry không thay đổi)
```

### Regression Checklist

- [ ] Tất cả 13 drawing tools hoạt động (line, rect, circle, arc, ellipse, polygon, slot, obround, spline, polyline, dimension, measure, text)
- [ ] DXF import → hiển thị đúng
- [ ] Nesting run → parts đặt đúng vị trí trên sheets
- [ ] Undo/Redo hoạt động
- [ ] Snap modes hoạt động (Endpoint, Midpoint, Center, Intersection)
- [ ] RadialMenu hiển thị đúng
- [ ] Modals (Settings, Part Params, Sheet Params, Stock DB, Nesting Info) hoạt động
- [ ] Footer coordinates đúng
- [ ] Zoom indicator đúng
- [ ] Export DXF/PDF hoạt động
- [ ] Part library hoạt động
- [ ] Sheet database hoạt động

---

## Dependency Graph

```
Phase 1a (useRef) 
    → measure performance 
    → [decision: is Canvas needed?]
    
Phase 1b (Canvas) [nếu cần]
    → Task 1.5 (map worldToScreen usages) TRƯỚC TIÊN
    → Task 1.6 (add canvas element)
    → Task 1.7 (coordinate transform)
    → Task 1.8 (Path2D cache) 
    → Task 1.9 (render loop)
    → Task 1.10 (text rendering)
    → Task 1.11 (hit testing)
    → Task 1.12 (hatch)
    
Phase 2 (Worker) [sau Phase 1a hoặc song song]
    → Task 2.1 (measure algorithm time) TRƯỚC TIÊN
    → Task 2.2 (create worker)
    → Task 2.3 (integrate)
    → Task 2.4 (progress UI)
    
Phase 3 (UX) [sau Phase 1b và 2]
    → Task 3.1 (LOD) — requires Canvas
    → Task 3.2 (zoom-to-cursor) — requires useRef from 1a
    → Task 3.3 (inertia) — requires useRef from 1a
    → Task 3.4 (Canvas previews) — independent
    → Task 3.5 (selection/hover) — requires Canvas
    → Task 3.6 (stats overlay) — independent, can do early
```

---

## Files Touched

| File | Phase | Change Type |
|------|-------|-------------|
| `components/NestingAXApp.tsx` | 1a, 1b, 2, 3 | Major refactor |
| `components/NestingAX/Workspace.tsx` | 1a, 1b | Major refactor |
| `components/NestingAX/services/nesting.ts` | 2 | Replace with Worker call |
| `components/nesting/NestingResults.tsx` | 3.4 | Canvas previews |
| `components/NestingAX/Sidebar.tsx` | 3.4 | Canvas previews |
| `components/NestingAX/Footer.tsx` | 1a | Read displayCoords state |
| `workers/nesting.worker.ts` | 2 | NEW FILE |
| `services/nesting/index.ts` | 2 | Import vào Worker |
| `services/nestingService.ts` | 2 | Import vào Worker |

---

## Notes & Decisions Made

1. **SVG overlay giữ nguyên** cho drawing tool previews — KHÔNG convert sang Canvas trong Phase 1
2. **DOM divs cho sheets/parts giữ nguyên** trong Phase 1 — migrate sau nếu cần
3. **Modal code không được chạm** (lines 5002–5945)
4. **LOD threshold = 200 entities** — dưới mức này, luôn full quality
5. **Inertia FRICTION = 0.95** (5% velocity loss per frame, khoảng 1s để dừng)
6. **Path2D trong world coordinates** — Canvas transform xử lý viewport
7. **rbush (R-Tree) DEFER** — chỉ thêm nếu profiling cho thấy hit-testing là bottleneck
8. **Web Worker pattern** theo `workers/gcode.worker.ts` đã có
9. **DevicePixelRatio** phải được handle từ Task 1.6 để tránh blur trên Retina
10. **Y-axis flip**: Canvas scaleY = -zoom, worldToScreen và Canvas transform phải đồng bộ
