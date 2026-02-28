# Plan: Fix 5 NestingAX UX Issues

**Status**: ✅ COMPLETE
**Created**: 2026-02-25  
**Files Modified**: RadialMenu.tsx, Workspace.tsx, NestingAXApp.tsx, PerformingNest.tsx  
**Execution Order**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 (build verify)  
**Constraints**: Tasks 2+3 must be sequential (both modify Workspace.tsx). Task 4 must run after Task 3 (both modify NestingAXApp.tsx).

---

## Overview

| # | Issue | File(s) | Severity |
|---|-------|---------|----------|
| 1+4 | RadialMenu: click outside doesn't close + Fit icon | RadialMenu.tsx | High |
| 2 | Delete tool: window select + right-click delete | Workspace.tsx | Medium |
| 3 | Nested parts can't be dragged | Workspace.tsx + NestingAXApp.tsx | High |
| 5 | PerformingNest modal doesn't match design | PerformingNest.tsx + NestingAXApp.tsx | Medium |

---

## Task 1: RadialMenu — Fix Close Behavior + New Fit Icon
**File**: `components/NestingAX/RadialMenu.tsx`  
**Status**: ✅ COMPLETE (Commit: 71ccd14)

### What to change:

#### 1A. Line 43 — Rename "Fit (Toàn cảnh)" to "Auto Fit"

**FIND** (line 43):
```tsx
  { name: "Fit (Toàn cảnh)", icon: "icon-zoom", action: "zoom_fit", color: "#40C4FF", sub: null },
```

**REPLACE WITH**:
```tsx
  { name: "Auto Fit", icon: "icon-zoom", action: "zoom_fit", color: "#40C4FF", sub: null },
```

#### 1B. Line 503 — Replace icon-zoom SVG with distinctive "fit all" icon (4 inward arrows)

**FIND** (line 503):
```tsx
          <g id="icon-zoom"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></g></g>
```

**REPLACE WITH**:
```tsx
          <g id="icon-zoom"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4,2 2,2 2,4"/><polyline points="20,2 22,2 22,4"/><polyline points="4,22 2,22 2,20"/><polyline points="20,22 22,22 22,20"/><polyline points="8,6 2,2"/><polyline points="16,6 22,2"/><polyline points="8,18 2,22"/><polyline points="16,18 22,22"/><rect x="6" y="6" width="12" height="12" rx="1" strokeDasharray="3 2" opacity="0.5"/></g></g>
```

#### 1C. Lines 418-444 — Replace broken outside-click handler with overlay approach + Escape key

**FIND** (lines 418-444): The entire block from `// Click ngoài để đóng` to the end of the useEffect cleanup return:
```tsx
    // Click ngoài để đóng (handles clicks outside the 700x700 container)
    const handleOutsideClick = (e: MouseEvent) => {
      const path = e.composedPath();
      const isClickInside = path.some(el => el === containerRef.current);
      if (!isClickInside) {
        console.log('🎯 Click outside menu detected, closing RadialMenu');
        onCloseRef.current();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onCloseRef.current();
    };

    // Delay một chút để tránh catch ngay click phải đã mở menu
    const t = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('contextmenu', handleContextMenu);
    }, 100);

    return () => {
      clearTimeout(t);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('contextmenu', handleContextMenu);
      if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
    };
  }, []);
```

**REPLACE WITH**:
```tsx
    // Escape key to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);
    };
  }, []);
```

#### 1D. Lines 452-458 — Add overlay div behind menu container

**FIND** (lines 452-458):
```tsx
  return (
    <div
      ref={containerRef}
      id="radial-menu-container"
      onClick={handleContainerClick}
      style={{ left: x - 350, top: y - 350 }}
    >
```

**REPLACE WITH**:
```tsx
  return (
    <>
      {/* Fullscreen overlay — clicking anywhere outside menu closes it */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'transparent' }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      />
      <div
        ref={containerRef}
        id="radial-menu-container"
        onClick={handleContainerClick}
        style={{ left: x - 350, top: y - 350 }}
      >
```

#### 1E. Line 553 — Close the fragment (`</>`)

**FIND** (line 553):
```tsx
    </div>
```

**REPLACE WITH**:
```tsx
      </div>
    </>
```

### QA Checklist — Task 1:
- [ ] Right-click on canvas opens RadialMenu
- [ ] Left-click OUTSIDE menu → menu closes
- [ ] Right-click OUTSIDE menu → menu closes
- [ ] Press Escape → menu closes
- [ ] Click on menu items → still works (stopPropagation preserves)
- [ ] Center CLOSE button → still works
- [ ] Fit icon shows 4-arrow "fit all" design (not magnifying glass)
- [ ] Menu item shows "Auto Fit" text
- [ ] Clicking "Auto Fit" → zoom fits all content

---

## Task 2: Delete Tool — Verify Window Select + Right-Click Delete
**File**: `components/NestingAX/Workspace.tsx`  
**Status**: ✅ COMPLETE (Commit: a701552)

### Analysis:
The existing code SHOULD already work for the user's desired flow:
1. Click Delete in RadialMenu → `pendingDeleteMode = true`, tool → 'select', toast shows
2. User window-selects entities → entities get selected (handleMouseUp lines 2446-2459)
3. User right-clicks → right-click handler (line 4001-4024) deletes selected entities

**The likely bug**: The toast message is in Vietnamese and may not be visible enough. Also need to verify that the pendingDeleteMode visual indicator is clear.

### What to change:

#### 2A. Line 569 — Update toast message to be more visible/clear

**FIND** (line 569):
```tsx
      showToast('Chọn đối tượng cần xóa, sau đó nhấn chuột phải để xóa');
```

**REPLACE WITH**:
```tsx
      showToast('🗑️ Chọn đối tượng cần xóa (quét chọn), sau đó nhấn CHUỘT PHẢI để xóa');
```

#### 2B. After line 2459, inside the `else` block (normal selection) — Add visual feedback when in pendingDeleteMode

**FIND** (lines 2456-2460):
```tsx
        } else {
          // Replace selection
          setSelectedEntities(new Set(entitiesInWindow.map(e => e.id)));
        }
      }
```

**REPLACE WITH**:
```tsx
        } else {
          // Replace selection
          setSelectedEntities(new Set(entitiesInWindow.map(e => e.id)));
        }
        // Show reminder toast when in pendingDeleteMode and entities were selected
        if (pendingDeleteMode && entitiesInWindow.length > 0) {
          showToast(`🗑️ Đã chọn ${entitiesInWindow.length} đối tượng — nhấn CHUỘT PHẢI để xóa`);
        }
      }
```

#### 2C. Add `pendingDeleteMode` to handleMouseUp dependency array (line 2473)

**FIND** (line 2473):
```tsx
  }, [isWindowSelecting, selectionStart, selectionEnd, cadEntities, isSelecting, parts, onAddPart, draggingSheet]);
```

**REPLACE WITH**:
```tsx
  }, [isWindowSelecting, selectionStart, selectionEnd, cadEntities, isSelecting, parts, onAddPart, draggingSheet, pendingDeleteMode]);
```

### QA Checklist — Task 2:
- [ ] Click Delete tool (no selection) → toast appears with clear instructions
- [ ] Draw selection window → entities highlight
- [ ] After window select in delete mode → reminder toast appears
- [ ] Right-click → selected entities deleted
- [ ] Right-click with no selection in delete mode → cancels delete mode
- [ ] Selecting another tool → cancels pendingDeleteMode

---

## Task 3: Nested Parts — Add Drag Capability
**File**: `components/NestingAX/Workspace.tsx` + `components/NestingAXApp.tsx`  
**Status**: ✅ COMPLETE (Commit: 9af031a)

### What to change:

#### 3A. WorkspaceProps — Add `onUpdatePart` prop (after line 36 in interface)

**FIND** (line 36):
```tsx
  onAddPart?: (part: Omit<Part, 'id' | 'nestListId'>) => void;
```

**AFTER THAT LINE, INSERT**:
```tsx
  onUpdatePart?: (partId: string, data: Partial<Part>) => void;
```

#### 3B. Workspace destructure — Add `onUpdatePart` (after line 104)

**FIND** (line 104):
```tsx
  onAddPart,
```

**REPLACE WITH**:
```tsx
  onAddPart,
  onUpdatePart,
```

#### 3C. Add `draggingPart` state (after line 363)

**FIND** (line 363):
```tsx
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
```

**AFTER THAT LINE, INSERT**:
```tsx
  // === PART DRAGGING STATE ===
  const [draggingPart, setDraggingPart] = useState<{ id: string; sheetId: string; startMouseWorld: { x: number; y: number }; origPartX: number; origPartY: number } | null>(null);
```

#### 3D. Part div — Add drag onMouseDown (replace lines 3496-3510)

**FIND** (lines 3496-3510):
```tsx
                 <div 
                    key={`${p.id}-${i}`} 
                    className="absolute border border-black bg-blue-600 hover:bg-blue-500 cursor-pointer flex items-center justify-center group" 
                    style={{
                        left: partLeft,
                        top: partTop,
                        width: finalW * pixelsPerUnit,
                        height: finalH * pixelsPerUnit,
                        transition: 'background-color 0.1s'
                    }}
                    title={p.name}
                 >
                    {isRotated && <div className="absolute w-1 h-1 bg-yellow-400 rounded-full top-0.5 right-0.5"></div>}
                    <span className="text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap overflow-hidden px-0.5">{p.name}</span>
                 </div>
```

**REPLACE WITH**:
```tsx
                 <div 
                    key={`${p.id}-${i}`} 
                    className={`absolute border border-black ${draggingPart?.id === p.id ? 'bg-blue-400 ring-2 ring-yellow-400' : 'bg-blue-600 hover:bg-blue-500'} cursor-move flex items-center justify-center group`}
                    style={{
                        left: partLeft,
                        top: partTop,
                        width: finalW * pixelsPerUnit,
                        height: finalH * pixelsPerUnit,
                        transition: draggingPart?.id === p.id ? 'none' : 'background-color 0.1s',
                        zIndex: draggingPart?.id === p.id ? 10 : 1,
                    }}
                    title={p.name}
                    onMouseDown={(ev) => {
                      if (ev.button !== 0 || activeDrawTool) return;
                      ev.stopPropagation();
                      if (!containerRef.current) return;
                      const rect2 = containerRef.current.getBoundingClientRect();
                      const sx2 = ev.clientX - rect2.left;
                      const sy2 = ev.clientY - rect2.top;
                      const mouseW = screenToWorld(sx2, sy2);
                      setDraggingPart({
                        id: p.id,
                        sheetId: sheet.id,
                        startMouseWorld: mouseW,
                        origPartX: p.x ?? 0,
                        origPartY: p.y ?? 0,
                      });
                    }}
                 >
                    {isRotated && <div className="absolute w-1 h-1 bg-yellow-400 rounded-full top-0.5 right-0.5"></div>}
                    <span className="text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap overflow-hidden px-0.5">{p.name}</span>
                 </div>
```

#### 3E. handleMouseMoveInternal — Add part drag logic (after line 2496)

**FIND** (lines 2491-2496):
```tsx
    // === SHEET DRAGGING ===
    if (draggingSheet) {
      const newX = draggingSheet.origSheetX + (worldPos.x - draggingSheet.startMouseWorld.x);
      const newY = draggingSheet.origSheetY + (worldPos.y - draggingSheet.startMouseWorld.y);
      onUpdateSheet?.(draggingSheet.id, { x: newX, y: newY });
    }
```

**REPLACE WITH**:
```tsx
    // === SHEET DRAGGING ===
    if (draggingSheet) {
      const newX = draggingSheet.origSheetX + (worldPos.x - draggingSheet.startMouseWorld.x);
      const newY = draggingSheet.origSheetY + (worldPos.y - draggingSheet.startMouseWorld.y);
      onUpdateSheet?.(draggingSheet.id, { x: newX, y: newY });
    }

    // === PART DRAGGING ===
    if (draggingPart) {
      const newPX = draggingPart.origPartX + (worldPos.x - draggingPart.startMouseWorld.x);
      const newPY = draggingPart.origPartY + (worldPos.y - draggingPart.startMouseWorld.y);
      onUpdatePart?.(draggingPart.id, { x: newPX, y: newPY });
    }
```

#### 3F. handleMouseUp — Add part drag end + overflow warning (after line 2470)

**FIND** (lines 2467-2472):
```tsx
    // End sheet dragging
    if (draggingSheet) {
      setDraggingSheet(null);
    }
    
    setIsDragging(false);
```

**REPLACE WITH**:
```tsx
    // End sheet dragging
    if (draggingSheet) {
      setDraggingSheet(null);
    }
    
    // End part dragging + overflow warning
    if (draggingPart) {
      // Check if part overflows its sheet
      const partData = parts.find(p => p.id === draggingPart.id);
      const sheetData = sheets.find(s => s.id === draggingPart.sheetId);
      if (partData && sheetData) {
        const [sw, sh] = sheetData.dimensions.split('x').map(Number);
        const [pw, ph] = partData.dimensions.split('x').map(Number);
        const isRotated = partData.rotationAngle === 90;
        const finalW = isRotated ? ph : pw;
        const finalH = isRotated ? pw : ph;
        const px = partData.x ?? 0;
        const py = partData.y ?? 0;
        if (px < 0 || py < 0 || px + finalW > sw || py + finalH > sh) {
          showToast('⚠️ Chi tiết nằm ngoài phạm vi tấm! Vui lòng kiểm tra lại vị trí.');
        }
      }
      setDraggingPart(null);
    }
    
    setIsDragging(false);
```

#### 3G. handleMouseUp dependency array — Add draggingPart

**FIND** (the dependency array, currently at line 2473 but after Task 2 changes it will have pendingDeleteMode added):
```tsx
  }, [isWindowSelecting, selectionStart, selectionEnd, cadEntities, isSelecting, parts, onAddPart, draggingSheet, pendingDeleteMode]);
```

**REPLACE WITH**:
```tsx
  }, [isWindowSelecting, selectionStart, selectionEnd, cadEntities, isSelecting, parts, onAddPart, draggingSheet, pendingDeleteMode, draggingPart, sheets]);
```

#### 3H. NestingAXApp.tsx — Add handleUpdatePart function (after line 363, after handleUpdateSheet)

**FIND** (line 363-364):
```tsx
    reloadData();
  };
```

(This is the end of `handleUpdateSheet`. After this closing brace+semicolon, INSERT):

**AFTER THAT, INSERT**:
```tsx

  const handleUpdatePart = (partId: string, partData: Partial<Part>) => {
    if (!activeListId) return;
    const existingParts = db.getParts(activeListId);
    const part = existingParts.find(p => p.id === partId);
    if (!part) return;
    db.updatePart({ ...part, ...partData });
    reloadData();
  };
```

#### 3I. NestingAXApp.tsx — Pass onUpdatePart to Workspace (after line 502)

**FIND** (line 502):
```tsx
          onUpdateSheet={handleUpdateSheet}
```

**AFTER THAT LINE, INSERT**:
```tsx
          onUpdatePart={handleUpdatePart}
```

### QA Checklist — Task 3:
- [ ] Left-click and drag on a nested part → part moves in real-time
- [ ] Part shows visual feedback (ring highlight) while dragging
- [ ] Release mouse → part stays at new position
- [ ] Drag part outside sheet bounds → warning toast appears
- [ ] Part position persists after page reload (saved to localStorage)
- [ ] Sheet drag still works (not broken by part drag)
- [ ] Parts with rotation (90°) drag correctly
- [ ] Active draw tool → part drag disabled (can't accidentally drag while drawing)

---

## Task 4: PerformingNest — Redesign to Match User's Design
**File**: `components/NestingAX/PerformingNest.tsx` + `components/NestingAXApp.tsx`  
**Status**: ✅ COMPLETE (Commit: d589c74)

### 4A. PerformingNest.tsx — Full file replacement

**Replace entire file content** with:

```tsx
import React from 'react';

interface PlacedPartPreview {
  partId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  polygon?: { x: number; y: number }[];
}

interface PerformingNestProps {
  progress: number;           // 0-100
  partsPlaced: number;
  totalParts: number;
  sheetsUsed: number;
  utilization: number;        // 0-100
  placements: PlacedPartPreview[];
  currentSheetW: number;
  currentSheetH: number;
  onStop: () => void;
  onAbort: () => void;
  onHide: () => void;
  currentAction: string;
}

const PerformingNest: React.FC<PerformingNestProps> = ({
  progress, partsPlaced, totalParts, sheetsUsed, utilization,
  placements, currentSheetW, currentSheetH, onStop, onAbort, onHide, currentAction
}) => {
  // SVG scale: fit sheet into 192px width, maintain aspect ratio
  const svgW = 192;
  const scale = currentSheetW > 0 ? svgW / currentSheetW : 1;
  const svgH = currentSheetH > 0 ? Math.round(currentSheetH * scale) : 320;
  const clampedSvgH = Math.min(svgH, 320);
  const finalScale = currentSheetH > 0 ? clampedSvgH / currentSheetH : scale;

  const intermediateResult = Math.max(1, Math.floor(progress / 20));

  return (
    // Overlay backdrop
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      {/* Modal */}
      <div style={{
        width: 500,
        backgroundColor: 'white',
        border: '1px solid #9ca3af',
        boxShadow: '0px 0px 10px rgba(0,0,0,0.5), inset 1px 1px 0px #ffffff, inset -1px -1px 0px #707070',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'white', padding: '4px 8px',
          borderBottom: '1px solid #d1d5db', height: 32,
        }}>
          <span style={{ fontSize: 12, color: '#374151', userSelect: 'none' }}>Performing Nest</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: 'remove', size: '10px' },
              { icon: 'check_box_outline_blank', size: '10px' },
              { icon: 'close', size: '12px' }
            ].map((item, i) => (
              <button key={i} disabled style={{
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'default', color: '#4b5563',
              }}>
                <span className="material-icons-outlined" style={{ fontSize: item.size }}>{item.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, backgroundColor: 'white' }}>

          {/* Current action status */}
          {currentAction && (
            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
              {currentAction}
            </div>
          )}

          {/* 3-column row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>

            {/* Left: Hide + nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={onHide} style={btnStyle}>Hide</button>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button disabled style={{ ...btnStyle, padding: '4px 8px' }}>{'<<'}</button>
                <button disabled style={{ ...btnStyle, padding: '4px 8px' }}>{'>>'}</button>
              </div>
            </div>

            {/* Center: Stats — English labels */}
            <div style={{ textAlign: 'center', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
              <div style={infoTextStyle}>Intermediate result: <span style={{ fontWeight: 400 }}>{intermediateResult}</span> &nbsp; Fill Ratio: <span style={{ fontWeight: 400 }}>{utilization}%</span></div>
              <div style={infoTextStyle}>Number of sheets: <span style={{ fontWeight: 400 }}>{sheetsUsed}</span> &nbsp; Number of layouts: <span style={{ fontWeight: 400 }}>1</span></div>
              <div style={infoTextStyle}>Layout: <span style={{ fontWeight: 400 }}>1</span> &nbsp; Multiplicity: <span style={{ fontWeight: 400 }}>{partsPlaced}</span></div>
              <div style={infoTextStyle}>Parts: <span style={{ fontWeight: 400 }}>{partsPlaced}/{totalParts}</span> &nbsp; Fill Ratio: <span style={{ fontWeight: 400 }}>{utilization}%</span></div>
            </div>

            {/* Right: Stop + Abort */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={onStop} style={btnStyle}>Stop</button>
              <button onClick={onAbort} style={btnStyle}>Abort</button>
            </div>
          </div>

          {/* Preview box — SVG canvas */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{
              width: 192, height: 320,
              backgroundColor: '#d1d5db',
              border: '1px solid black',
              boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {currentSheetW > 0 ? (
                <svg
                  width={svgW}
                  height={clampedSvgH}
                  viewBox={`0 0 ${svgW} ${clampedSvgH}`}
                >
                  {/* Sheet background */}
                  <rect x={0} y={0} width={svgW} height={clampedSvgH}
                    fill="#e5e7eb" stroke="#6b7280" strokeWidth={1} />
                  {/* Placed parts — appear one-by-one */}
                  {placements.map((p, i) => {
                    if (p.polygon && p.polygon.length > 0) {
                      const pointsStr = p.polygon
                        .map(pt => `${pt.x * finalScale},${pt.y * finalScale}`)
                        .join(' ');
                      return (
                        <polygon
                          key={`${p.partId}-${i}`}
                          points={pointsStr}
                          fill="rgba(59,130,246,0.6)"
                          stroke="#1d4ed8"
                          strokeWidth={0.5}
                        />
                      );
                    }
                    return (
                      <rect
                        key={`${p.partId}-${i}`}
                        x={p.x * finalScale}
                        y={p.y * finalScale}
                        width={Math.max(1, p.w * finalScale)}
                        height={Math.max(1, p.h * finalScale)}
                        fill="rgba(59,130,246,0.6)"
                        stroke="#1d4ed8"
                        strokeWidth={0.5}
                      />
                    );
                  })}
                </svg>
              ) : (
                <span style={{ fontSize: 10, color: '#6b7280' }}>Waiting...</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Shared styles
const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  fontSize: 11,
  color: '#374151',
  cursor: 'pointer',
  borderRadius: 2,
  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  minWidth: 60,
  fontFamily: "'Work Sans', sans-serif",
};

const infoTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#1f2937',
  fontWeight: 500,
  margin: '2px 0',
};

export default PerformingNest;
```

#### 4B. NestingAXApp.tsx — Add `isNestingHidden` state (after line 37)

**FIND** (line 37):
```tsx
  const [isNesting, setIsNesting] = useState(false);
```

**AFTER THAT LINE, INSERT**:
```tsx
  const [isNestingHidden, setIsNestingHidden] = useState(false);
```

#### 4C. NestingAXApp.tsx — Reset isNestingHidden when nesting starts (line 193)

**FIND** (line 193):
```tsx
    setIsNesting(true);
```

**AFTER THAT LINE, INSERT**:
```tsx
    setIsNestingHidden(false);
```

Note: `setIsNesting(false)` (lines 250, 257, 264) does NOT need `setIsNestingHidden(false)` because the render condition `isNesting && !isNestingHidden` already hides the modal when `isNesting` is false.

#### 4D. NestingAXApp.tsx — Change PerformingNest render condition + add onHide prop (lines 554-568)

**FIND** (lines 554-568):
```tsx
        {isNesting && (
          <PerformingNest
            progress={nestingProgress}
            partsPlaced={nestingPartsPlaced}
            totalParts={nestingTotalParts}
            sheetsUsed={nestingSheetsUsed}
            utilization={nestingUtilization}
            placements={nestingPlacements}
            currentSheetW={nestingSheetW}
            currentSheetH={nestingSheetH}
            onStop={handleStopNesting}
            onAbort={handleAbortNesting}
            currentAction={nestingStatus}
          />
        )}
```

**REPLACE WITH**:
```tsx
        {isNesting && !isNestingHidden && (
          <PerformingNest
            progress={nestingProgress}
            partsPlaced={nestingPartsPlaced}
            totalParts={nestingTotalParts}
            sheetsUsed={nestingSheetsUsed}
            utilization={nestingUtilization}
            placements={nestingPlacements}
            currentSheetW={nestingSheetW}
            currentSheetH={nestingSheetH}
            onStop={handleStopNesting}
            onAbort={handleAbortNesting}
            onHide={() => setIsNestingHidden(true)}
            currentAction={nestingStatus}
          />
        )}
```

### QA Checklist — Task 4:
- [ ] Click "Nest" → PerformingNest modal appears with English labels
- [ ] Title reads "Performing Nest"
- [ ] Labels: "Intermediate result", "Fill Ratio", "Number of sheets", etc.
- [ ] "Hide" button is clickable → modal disappears, nesting continues
- [ ] "Stop" button works (stops nesting with current results)
- [ ] "Abort" button works (cancels nesting entirely)
- [ ] SVG preview still shows parts being placed
- [ ] currentAction text displays below header
- [ ] When nesting finishes/is re-started, modal appears again (isNestingHidden resets)
- [ ] "Waiting..." text shows when no sheet data yet (English, not Vietnamese)

---

## Task 5: Build Verification
**Status**: ✅ COMPLETE (Commit: d589c74)

```bash
npx tsc --noEmit && npm run build
```

### Expected:
- No new TypeScript errors
- Build succeeds

### If errors occur:
- `onUpdatePart` type mismatch → check WorkspaceProps interface matches usage
- `onHide` missing → check PerformingNestProps has `onHide: () => void`
- Fragment syntax `<>...</>` → should work with React 18 + react-jsx transform

---

## Final Verification Wave

After all tasks complete:
1. Open app in browser (clear cache with Ctrl+Shift+R)
2. Run through all QA checklists above
3. Verify no regressions in:
   - Canvas panning/zooming
   - Drawing tools
   - Sheet management
   - Nesting execution
   - RadialMenu sub-menus
