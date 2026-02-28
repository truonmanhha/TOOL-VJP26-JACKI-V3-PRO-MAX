# Plan: Hoàn thiện FOOTER 1 (Status Bar)

**Ngày tạo**: 2026-02-25  
**Trạng thái**: 🔄 Chưa bắt đầu

---

## Mục tiêu

FOOTER 1 (inline status bar `h-7`) hiện đang thiếu nhiều thứ. Cần bổ sung:
- Zoom% thực tế (đang hardcode "N/A")
- DYN indicator (chỉ hiển thị ON/OFF — không click)
- Crosshair (+) indicator (chỉ hiển thị ON/OFF — không click)
- Crosshair size slider (hiển thị + điều chỉnh size)
- Nút × (đóng tất cả panels/modals)

---

## Task 1 — Workspace.tsx: thêm callbacks
**File**: `components/NestingAX/Workspace.tsx`  
**Trạng thái**: ⬜ Chưa làm

### 1A. Thêm props vào interface WorkspaceProps (sau dòng 27)

**Dòng 27 hiện tại:**
```typescript
  onMouseWorldPos?: (pos: { x: number; y: number }) => void;
```

**Thêm SAU dòng 27 (trước dòng 28 `// Part Workflow`):**
```typescript

  // FOOTER 1 — Broadcast state to parent (read-only mirror)
  onZoomChange?: (zoom: number) => void;
  onCrosshairChange?: (show: boolean) => void;
  onCrosshairSizeChange?: (size: number) => void;
  onDynInputChange?: (show: boolean) => void;
  // FOOTER 1 — Store setter for crosshair size (write-back from slider)
  onSetCrosshairSize?: (fn: (size: number) => void) => void;
```

---

### 1B. Destructure props mới (sau dòng 96)

**Dòng 96 hiện tại:**
```typescript
  onMouseWorldPos,
```

**Thêm SAU dòng 96 (trước dòng 97 — dòng trống):**
```typescript
  onZoomChange,
  onCrosshairChange,
  onCrosshairSizeChange,
  onDynInputChange,
  onSetCrosshairSize,
```

---

### 1C. Thêm useEffects broadcast (sau dòng 380)

**Dòng 377-380 hiện tại:**
```typescript
  /** Broadcast mouse world position to parent via callback */
  useEffect(() => {
    onMouseWorldPos?.(mouseWorldPos);
  }, [mouseWorldPos, onMouseWorldPos]);
```

**Thêm SAU dòng 380:**
```typescript

  /** FOOTER 1: Broadcast zoom to parent */
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  /** FOOTER 1: Broadcast crosshair state to parent */
  useEffect(() => {
    onCrosshairChange?.(showCrosshair);
  }, [showCrosshair, onCrosshairChange]);

  /** FOOTER 1: Broadcast crosshair size to parent */
  useEffect(() => {
    onCrosshairSizeChange?.(crosshairSize);
  }, [crosshairSize, onCrosshairSizeChange]);

  /** FOOTER 1: Broadcast DYN input state to parent */
  useEffect(() => {
    onDynInputChange?.(showCommandInput);
  }, [showCommandInput, onDynInputChange]);
```

---

### 1D. Store setCrosshairSize setter (sau dòng 349)

**Dòng 346-349 hiện tại:**
```typescript
  // Store export handler for Footer to use
  useEffect(() => {
    onStoreExportHandler?.(handleExport);
  }, [handleExport, onStoreExportHandler]);
```

**Thêm SAU dòng 349:**
```typescript

  // Store setCrosshairSize for FOOTER 1 slider to write-back
  useEffect(() => {
    onSetCrosshairSize?.(setCrosshairSize);
  }, [onSetCrosshairSize]);
```

---

## Task 2 — NestingAXApp.tsx: thêm state + wire + replace FOOTER 1
**File**: `components/NestingAXApp.tsx`  
**Trạng thái**: ⬜ Chưa làm

### 2A. Thêm ref và mirror states (sau dòng 22)

**Dòng 20-22 hiện tại:**
```typescript
  const exportHandlerRef = React.useRef<((format: 'dxf' | 'svg' | 'pdf') => void) | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
```

**Thêm SAU dòng 22:**
```typescript

  // FOOTER 1 — Mirror states from Workspace
  const setCrosshairSizeRef = React.useRef<((size: number) => void) | null>(null);
  const [wsZoom, setWsZoom] = useState(0.8);
  const [wsShowCrosshair, setWsShowCrosshair] = useState(true);
  const [wsCrosshairSize, setWsCrosshairSize] = useState(100);
  const [wsShowDynInput, setWsShowDynInput] = useState(true);
```

---

### 2B. Thêm handleCloseOverlays (sau dòng 100)

**Dòng 97-100 hiện tại:**
```typescript
  const handleLayerChange = useCallback(() => {
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);
```

**Thêm SAU dòng 100:**
```typescript

  // FOOTER 1: Close all overlays
  const handleCloseOverlays = useCallback(() => {
    setShowModal(false);
    setShowSettingsModal(false);
    setContextMenu(null);
    setRadialMenu(null);
    setShowPartParamsModal(false);
    setShowSheetParamsModal(false);
    setIsManualNesting(false);
    setShowNestingInfo(false);
    setShowLayerPanel(false);
    setIsSelecting(false);
    setIsSelectingSheet(false);
  }, []);
```

---

### 2C. Thêm props mới vào `<Workspace>` (sau dòng 531)

**Dòng 529-532 hiện tại:**
```jsx
          onStoreDXFHandler={(handler) => { dxfImportHandlerRef.current = handler; }}
          onStoreExportHandler={(handler) => { exportHandlerRef.current = handler; }}
          onMouseWorldPos={handleMouseWorldPos}
        />
```

**Thay dòng 531-532 thành:**
```jsx
          onMouseWorldPos={handleMouseWorldPos}

          // FOOTER 1 — Broadcast callbacks
          onZoomChange={setWsZoom}
          onCrosshairChange={setWsShowCrosshair}
          onCrosshairSizeChange={setWsCrosshairSize}
          onDynInputChange={setWsShowDynInput}
          onSetCrosshairSize={(fn) => { setCrosshairSizeRef.current = fn; }}
        />
```

---

### 2D. Replace FOOTER 1 — thay toàn bộ dòng 570-597

**XÓA từ dòng 570 đến dòng 597 (toàn bộ status bar cũ):**
```jsx
      {/* ═══════════════════════════════════════════════════════════════════
          STATUS BAR (AutoCAD 2022 Style) - Bottom of canvas
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-none w-full h-7 bg-slate-900/95 border-t border-slate-700 flex items-center justify-between px-2 z-10 pointer-events-auto select-none" onWheel={e => e.preventDefault()}>
        {/* Left: Coordinate Display */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">X:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.x.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">Y:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.y.toFixed(2)}</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="flex items-center gap-1 text-white/60">
            <span>Zoom:</span>
            <span className="text-yellow-400">N/A</span>
          </div>
        </div>
        {/* Center: Status Info */}
        <div className="flex items-center gap-2 text-[10px] text-white/60">
          {/* Status placeholder */}
        </div>
        {/* Right: Toggle Buttons (AutoCAD Style) */}
        <div className="flex items-center gap-1">
        </div>
      </div>
```

**THAY BẰNG:**
```jsx
      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER 1 — Status Bar (AutoCAD 2022 Style)
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-none w-full h-7 bg-slate-900/95 border-t border-slate-700 flex items-center justify-between px-2 z-10 pointer-events-auto select-none"
        onWheel={e => e.preventDefault()}
      >
        {/* Left: Coordinates + Zoom */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">X:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.x.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">Y:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.y.toFixed(2)}</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="flex items-center gap-1 text-white/60">
            <span>Zoom:</span>
            <span className="text-yellow-400">{Math.round(wsZoom * 100)}%</span>
          </div>
        </div>

        {/* Center: DYN + Crosshair indicators */}
        <div className="flex items-center gap-1 text-[10px]">
          {/* DYN indicator — read only */}
          <div
            className={`px-1.5 py-0.5 rounded-sm border font-bold select-none ${
              wsShowDynInput
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
            title="Dynamic Input (F12)"
          >
            DYN
          </div>
          {/* Crosshair (+) indicator — read only */}
          <div
            className={`px-1.5 py-0.5 rounded-sm border font-bold select-none ${
              wsShowCrosshair
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
            title="Crosshair (F6)"
          >
            +
          </div>
        </div>

        {/* Right: Crosshair size slider + Close button */}
        <div className="flex items-center gap-2">
          {/* Crosshair size slider — only visible when crosshair is ON */}
          {wsShowCrosshair && (
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <span className="material-icons-outlined text-[12px]">straighten</span>
              <input
                type="range"
                min={10}
                max={100}
                value={wsCrosshairSize}
                onChange={e => {
                  const size = Number(e.target.value);
                  setWsCrosshairSize(size);
                  setCrosshairSizeRef.current?.(size);
                }}
                className="w-16 h-1 accent-emerald-400 cursor-pointer"
                title={`Crosshair size: ${wsCrosshairSize}%`}
              />
              <span className="text-emerald-400 w-7">{wsCrosshairSize}%</span>
            </div>
          )}
          {/* Close all overlays */}
          <button
            onClick={handleCloseOverlays}
            className="px-1.5 py-0.5 rounded-sm border border-slate-600 bg-slate-800 hover:bg-red-900/40 hover:border-red-500 text-slate-400 hover:text-red-300 text-[11px] transition-colors"
            title="Close all panels"
          >
            <span className="material-icons-outlined text-[12px]">close</span>
          </button>
        </div>
      </div>
```

---

## Task 3 — Build verify + commit
**Trạng thái**: ⬜ Chưa làm

```bash
npx tsc --noEmit
npm run build
```

Commit message:
```
feat(nesting): complete FOOTER 1 with zoom%, DYN/crosshair indicators, size slider, close overlays
```

---

## Dependency graph

```
Task 1 (Workspace callbacks) → Task 2 (NestingAXApp wiring) → Task 3 (build + commit)
```

---

## Guardrails

- ❌ KHÔNG làm DYN/Crosshair buttons clickable — chỉ indicators
- ❌ KHÔNG sửa Footer.tsx
- ❌ KHÔNG thay đổi thứ tự layout
- ❌ KHÔNG abort nesting khi click ×
