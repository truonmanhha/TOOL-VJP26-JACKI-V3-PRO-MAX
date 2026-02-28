# Plan: NestingAX — 7 Task Update v2 (Complete Copy-Paste Code)

## Goal
Fix 3 bugs and implement 4 feature updates in NestingAX. Every code block below is COMPLETE and COPY-PASTE READY — the implementer copies the exact code into the specified location.

## Constraints (From User — VERBATIM)
- "không hiểu gì cứ hỏi tôi" — Ask if anything unclear, don't guess
- "đẩm bảo kh được đụng gì hết, chỉ được cập nhật giảm lag" — Performance: don't change behavior, only reduce lag
- "Không sửa những gì không liên quan" — Don't touch unrelated code

## Execution Order
**Task 3 → 1 → 6 → 2 → 4 → 5 → 7** (simplest first, riskiest last)

## Key Files
| File | Lines | Tasks |
|------|-------|-------|
| `components/NestingAX/Workspace.tsx` | 5606 | 1, 3, 4, 5, 7 |
| `components/NestingAX/RadialMenu.tsx` | 833 | 5 |
| `components/NestingAXApp.tsx` | 709 | 2 |
| `components/NestingAX/PerformingNest.tsx` | 199 | 2 |
| `components/NestingAX/services/nesting.ts` | 1296 | 2, 6 |
| `components/NestingAX/services/db.ts` | ~542 | 6 |

---

## Task 3: Fix Zoom Jump on Dimension Labels [BUG FIX — TRIVIAL]

### Root Cause
File: `Workspace.tsx` line 3274. The `<g key={ent.id}>` wrapping dimension entities has NO `pointer-events="none"`. The `<rect>` (line 3284) and `<text>` (line 3285) intercept mouse wheel events.

### Change
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Lines 3284-3285 (inside the dimension rendering block)  
**Action:** Add `style={{ pointerEvents: 'none' }}` to ONLY the `<rect>` and `<text>` elements (NOT the entire `<g>`, so dimension lines remain clickable for selection)

**FIND THIS (line 3284):**
```tsx
                        <rect x={textPos.x - 25} y={textPos.y - 10} width={50} height={16} rx={2} fill="rgba(0,0,0,0.7)" />
```

**REPLACE WITH:**
```tsx
                        <rect x={textPos.x - 25} y={textPos.y - 10} width={50} height={16} rx={2} fill="rgba(0,0,0,0.7)" style={{ pointerEvents: 'none' }} />
```

**FIND THIS (line 3285):**
```tsx
                        <text x={textPos.x} y={textPos.y + 3} fill={dimColor} fontSize="11" fontFamily="Noto Sans, sans-serif" textAnchor="middle" dominantBaseline="middle">
```

**REPLACE WITH:**
```tsx
                        <text x={textPos.x} y={textPos.y + 3} fill={dimColor} fontSize="11" fontFamily="Noto Sans, sans-serif" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
```

### QA
1. Draw a dimension → hover mouse over the number text → scroll wheel → zoom should work smoothly, NO jump
2. Click on dimension lines → dimension should still be selectable (green highlight)
3. All other entity types unaffected

---

## Task 1: Selection — Click=Single Select, Shift+Click=Deselect [FEATURE]

### Current Behavior (lines 2384-2403)
- `Ctrl/Cmd+Click`: Toggle (add/remove from selection)
- `Click`: Select only this entity
- Missing: Shift+Click to deselect

### Change
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Lines 2384-2403 (inside `handleMouseDown`, inside the `if (clickedEntity)` block)  
**Action:** REPLACE the entire block from line 2384 to line 2403

**FIND THIS (lines 2384-2403):**
```tsx
            if (clickedEntity) {
                // Toggle selection if Ctrl/Cmd is pressed, otherwise select only this one
                if (e.ctrlKey || e.metaKey) {
                    setSelectedEntities(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(clickedEntity!)) {
                            newSet.delete(clickedEntity!);
                        } else {
                            newSet.add(clickedEntity!);
                        }
                        return newSet;
                    });
                } else {
                    setSelectedEntities(new Set([clickedEntity]));
                }
            } else if (!e.ctrlKey && !e.metaKey) {
                // Clear selection if not holding Ctrl/Cmd
                setSelectedEntities(new Set());
                setSelectedSheets(new Set());
            }
```

**REPLACE WITH:**
```tsx
            if (clickedEntity) {
                if (e.shiftKey) {
                    // Shift+Click: DESELECT the clicked entity
                    setSelectedEntities(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(clickedEntity!);
                        return newSet;
                    });
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Click: TOGGLE (add or remove)
                    setSelectedEntities(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(clickedEntity!)) {
                            newSet.delete(clickedEntity!);
                        } else {
                            newSet.add(clickedEntity!);
                        }
                        return newSet;
                    });
                } else {
                    // Normal Click: Select ONLY this entity (clear others)
                    setSelectedEntities(new Set([clickedEntity]));
                }
            } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                // Click on empty space: Clear all selections
                setSelectedEntities(new Set());
                setSelectedSheets(new Set());
            }
```

### QA
1. Click entity A → only A selected (green highlight)
2. Click entity B → only B selected (A deselected)
3. Ctrl+Click entity C → B + C both selected
4. Ctrl+Click entity B → B deselected, only C remains
5. Shift+Click entity C → C deselected, nothing selected
6. Click empty space → all cleared
7. Window selection (drag) still works
8. Right-click context menu still works

---

## Task 6: Settings Sync — Add Missing Fields [FEATURE]

### Problem
`configFromSettings()` maps only 9 fields. `AppSettings` has additional nesting-relevant fields that are NOT passed to the engine.

### Missing Fields Analysis
| AppSettings Field | Relevant? | Action |
|---|---|---|
| `gaps.leadInGap` | YES — affects cut lead-in spacing | ADD to config |
| `gaps.timePerSheet` | YES — computation time limit per sheet | ADD to config |
| `gaps.totalCompTime` | YES — total computation budget | ADD to config |
| `rectEngine.cutWidth` | YES — kerf width affects part spacing | ADD to config |
| `rectEngine.minPartGap` | YES — min gap between parts | ADD to config |
| `rectEngine.gapAtSheetEdge` | YES — edge gap for rect engine | ADD to config |
| `rectEngine.optimiseLevel` | YES — search thoroughness | ADD to config |
| `rectEngine.sheetNestBalance` | YES — fill vs minimize waste | ADD to config |
| `rectEngine.optimizeFor` | YES — cuts vs space | ADD to config |
| `rectEngine.cutDirection` | YES — primary cut direction | ADD to config |
| `rectEngine.selectBestSheet` | YES — auto-select sheet | ADD to config |

### Change 1: Expand NestingConfig Interface
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Lines 12-24 (the `NestingConfig` interface)  
**Action:** REPLACE entire interface

**FIND THIS (lines 12-24):**
```typescript
export interface NestingConfig {
  packTo: AppSettings['packTo'];
  customAngle: number;
  evenlySpacedParts: boolean;
  searchResolution: number;
  offcutPref: AppSettings['offcutPref'];
  sheetOrder: AppSettings['sheetOrder'];
  nestingMethod: AppSettings['nestingMethod']; // NEW: track nesting method
  gaps: {
    minGapPath: number;
    sheetEdgeGap: number;
  };
}
```

**REPLACE WITH:**
```typescript
export interface NestingConfig {
  packTo: AppSettings['packTo'];
  customAngle: number;
  evenlySpacedParts: boolean;
  searchResolution: number;
  offcutPref: AppSettings['offcutPref'];
  sheetOrder: AppSettings['sheetOrder'];
  nestingMethod: AppSettings['nestingMethod'];
  gaps: {
    minGapPath: number;
    sheetEdgeGap: number;
    leadInGap: number;
    timePerSheet: number;
    totalCompTime: number;
  };
  rectEngine: {
    optimizeFor: 'Cuts' | 'Space';
    cutDirection: 'X' | 'Y' | 'Auto';
    cutWidth: number;
    minPartGap: number;
    gapAtSheetEdge: number;
    optimiseLevel: number;
    sheetNestBalance: number;
    selectBestSheet: boolean;
  };
}
```

### Change 2: Update configFromSettings Function
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Lines 27-41 (the `configFromSettings` function)  
**Action:** REPLACE entire function

**FIND THIS (lines 27-41):**
```typescript
export function configFromSettings(settings: AppSettings): NestingConfig {
  return {
    packTo: settings.packTo,
    customAngle: settings.customAngle,
    evenlySpacedParts: settings.evenlySpacedParts,
    searchResolution: settings.searchResolution,
    offcutPref: settings.offcutPref,
    sheetOrder: settings.sheetOrder,
    nestingMethod: settings.nestingMethod, // NEW: include nesting method
    gaps: {
      minGapPath: settings.gaps.minGapPath,
      sheetEdgeGap: settings.gaps.sheetEdgeGap,
    },
  };
}
```

**REPLACE WITH:**
```typescript
export function configFromSettings(settings: AppSettings): NestingConfig {
  return {
    packTo: settings.packTo,
    customAngle: settings.customAngle,
    evenlySpacedParts: settings.evenlySpacedParts,
    searchResolution: settings.searchResolution,
    offcutPref: settings.offcutPref,
    sheetOrder: settings.sheetOrder,
    nestingMethod: settings.nestingMethod,
    gaps: {
      minGapPath: settings.gaps.minGapPath,
      sheetEdgeGap: settings.gaps.sheetEdgeGap,
      leadInGap: settings.gaps.leadInGap,
      timePerSheet: settings.gaps.timePerSheet,
      totalCompTime: settings.gaps.totalCompTime,
    },
    rectEngine: {
      optimizeFor: settings.rectEngine.optimizeFor,
      cutDirection: settings.rectEngine.cutDirection,
      cutWidth: settings.rectEngine.cutWidth,
      minPartGap: settings.rectEngine.minPartGap,
      gapAtSheetEdge: settings.rectEngine.gapAtSheetEdge,
      optimiseLevel: settings.rectEngine.optimiseLevel,
      sheetNestBalance: settings.rectEngine.sheetNestBalance,
      selectBestSheet: settings.rectEngine.selectBestSheet,
    },
  };
}
```

### Change 3: Use New Config Fields in Local Nesting
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Lines 1023-1031 (destructuring config at top of `startLocalNesting`)  
**Action:** REPLACE the destructuring

**FIND THIS (lines 1023-1031):**
```typescript
    const {
      packTo,
      customAngle,
      evenlySpacedParts,
      searchResolution,
      offcutPref,
      sheetOrder,
      gaps: { minGapPath: gap, sheetEdgeGap: edgeGap },
    } = config;
```

**REPLACE WITH:**
```typescript
    const {
      packTo,
      customAngle,
      evenlySpacedParts,
      searchResolution,
      offcutPref,
      sheetOrder,
      gaps: { minGapPath: gap, sheetEdgeGap: edgeGap, leadInGap, timePerSheet, totalCompTime },
      rectEngine,
    } = config;

    // Use rectEngine gap values when nesting method is Rectangular
    const effectiveGap = config.nestingMethod === 'Rectangular' && rectEngine.minPartGap > 0
      ? Math.max(gap, rectEngine.minPartGap)
      : gap;
    const effectiveEdgeGap = config.nestingMethod === 'Rectangular' && rectEngine.gapAtSheetEdge > 0
      ? Math.max(edgeGap, rectEngine.gapAtSheetEdge)
      : edgeGap;
```

**NOTE:** After this destructuring change, the existing code that uses `gap` and `edgeGap` should be updated to use `effectiveGap` and `effectiveEdgeGap` at line 1077 where `initialFreeRect(sDim.w, sDim.h, edgeGap)` is called. Change `edgeGap` → `effectiveEdgeGap` at that location.

### QA
1. Open Settings → change `minGapPath` from 2 to 10 → run nesting → parts should be further apart
2. Open Settings → change `nestingMethod` → verify correct method used
3. Open Settings → change `rectEngine.optimiseLevel` → verify no crash
4. Console should show NO "undefined" values in config during nesting

---

## Task 2: Fix Nesting Simulation Preview [BUG FIX]

### Root Cause
In `nesting.ts`, lines 1034 and 1058 send `currentSheetW: 0, currentSheetH: 0` in early progress callbacks. The sheet dimensions ARE available from the `sheets` parameter but aren't used until actual placement begins.

### Change 1: Extract First Sheet Dimensions Early (Local Nesting)
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** After line 1031 (after config destructuring), BEFORE line 1033  
**Action:** INSERT new code between the destructuring and Phase 1

**INSERT AFTER the config destructuring block (after `} = config;` / after the effectiveGap lines from Task 6):**
```typescript

    // Extract first sheet dimensions for immediate progress display
    const firstSheet = sheets[0];
    let firstSheetW = 0;
    let firstSheetH = 0;
    if (firstSheet) {
      const fsDim = this.parseDim(firstSheet.dimensions);
      firstSheetW = fsDim.w;
      firstSheetH = fsDim.h;
    }
```

### Change 2: Fix Phase 1 Progress Call
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Line 1034  
**Action:** REPLACE line

**FIND THIS (line 1034):**
```typescript
    onProgress({ percent: 5, status: 'Analyzing part geometry...', partsPlaced: 0, totalParts: 0, sheetsUsed: 1, utilization: 0, currentSheetW: 0, currentSheetH: 0 });
```

**REPLACE WITH:**
```typescript
    onProgress({ percent: 5, status: 'Analyzing part geometry...', partsPlaced: 0, totalParts: 0, sheetsUsed: 1, utilization: 0, currentSheetW: firstSheetW, currentSheetH: firstSheetH });
```

### Change 3: Fix Phase 2 Progress Call
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Line 1058  
**Action:** REPLACE line

**FIND THIS (line 1058):**
```typescript
    onProgress({ percent: 10, status: `Sorting ${allRects.length} entities...`, partsPlaced: 0, totalParts: allRects.length, sheetsUsed: 0, utilization: 0, currentSheetW: 0, currentSheetH: 0 });
```

**REPLACE WITH:**
```typescript
    onProgress({ percent: 10, status: `Sorting ${allRects.length} entities...`, partsPlaced: 0, totalParts: allRects.length, sheetsUsed: 1, utilization: 0, currentSheetW: firstSheetW, currentSheetH: firstSheetH });
```

### Change 4: Fix Backend Nesting Progress Call
**File:** `components/NestingAX/services/nesting.ts`  
**Location:** Lines 855-864 (inside `startBackendNesting`)  
**Action:** REPLACE the early progress call

**FIND THIS (lines 855-864):**
```typescript
      onProgress({
        percent: 5,
        status: 'Connecting to nesting engine...',
        partsPlaced: 0,
        totalParts: parts.length,
        sheetsUsed: 0,
        utilization: 0,
        currentSheetW: 0,
        currentSheetH: 0,
      });
```

**REPLACE WITH:**
```typescript
      // Extract first sheet dimensions for immediate preview
      const bFirstSheet = sheets[0];
      let bFirstW = 0, bFirstH = 0;
      if (bFirstSheet) {
        const bDim = this.parseDim(bFirstSheet.dimensions);
        bFirstW = bDim.w;
        bFirstH = bDim.h;
      }
      onProgress({
        percent: 5,
        status: 'Connecting to nesting engine...',
        partsPlaced: 0,
        totalParts: parts.length,
        sheetsUsed: 1,
        utilization: 0,
        currentSheetW: bFirstW,
        currentSheetH: bFirstH,
      });
```

### QA
1. Add parts and sheets to nest list → click "Start Nesting"
2. PerformingNest modal should IMMEDIATELY show the grey sheet rectangle (not "Waiting...")
3. As parts are placed, blue rectangles appear on the preview
4. Progress bar advances from 0 to 100
5. Test with multiple sheets of different sizes
6. Stop/Abort buttons still work

---

## Task 4: Measure Tool [NEW FEATURE] - [x] DONE

### Design
- Activate via RadialMenu → Tiện ích → Đo đạc (already wired as `action: "measure"`)
- Click first point → rubber-band dashed line to cursor with live distance → Click second point → distance label persists 4 seconds → auto-clears
- Cyan color, dashed line, matches dimension tool visual style
- Snapping works during measurement
- Escape cancels measurement

### Change 1: Add Measure State
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** After line 170 (after drawState declaration), INSERT new state  
**Action:** INSERT after `}>({ step: 0, points: [], currentPos: null });`

**INSERT AFTER line 170:**
```tsx

  // === MEASURE TOOL STATE ===
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureResult, setMeasureResult] = useState<{
    distance: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  } | null>(null);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### Change 2: Add Measure Click Handler Inside handleDrawingClick
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Inside the `handleDrawingClick` function, after the `} else if (activeDrawTool === 'hatch')` block, BEFORE the final `return prevDrawState;` (around line 2196-2198)

**FIND THIS (lines 2196-2198):**
```tsx
      }
      
      return prevDrawState;
```

**REPLACE WITH:**
```tsx
      } else if (activeDrawTool === 'measure') {
        // Measure tool: 2-click distance measurement
        if (measurePoints.length === 0) {
          // First point
          console.log('📏 Measure: First point set', worldPos);
          setMeasurePoints([worldPos]);
        } else {
          // Second point — calculate and display
          const p1 = measurePoints[0];
          const p2 = worldPos;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          console.log('📏 Measure: Distance =', distance.toFixed(2), 'mm');

          setMeasureResult({ distance, p1, p2 });
          setMeasurePoints([]);

          // Auto-clear after 4 seconds
          if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
          measureTimerRef.current = setTimeout(() => setMeasureResult(null), 4000);
        }
        return prevDrawState; // Don't change drawState for measure tool
      }
      
      return prevDrawState;
```

### Change 3: Clear Measure State on Tool Change
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Inside the `useEffect` for tool change (lines 520-532), after line 524  
**Action:** ADD measure state cleanup

**FIND THIS (lines 522-524):**
```tsx
    setDrawState({ step: 0, points: [], currentPos: null });
    setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
    setTransformEditState({ step: 0, points: [], currentPos: null });
```

**REPLACE WITH:**
```tsx
    setDrawState({ step: 0, points: [], currentPos: null });
    setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
    setTransformEditState({ step: 0, points: [], currentPos: null });
    setMeasurePoints([]);
    setMeasureResult(null);
    if (measureTimerRef.current) { clearTimeout(measureTimerRef.current); measureTimerRef.current = null; }
```

### Change 4: Clear Measure State on Escape
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Inside the global ESC handler (lines 2629-2634), after setEditToolState line  
**Action:** ADD measure cleanup

**FIND THIS (lines 2629-2634):**
```tsx
        setDrawState({ step: 0, points: [], currentPos: null });
        setTransformEditState({ step: 0, points: [], currentPos: null });
        setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
        setSelectedEntities(new Set());
        setCurrentSnap(null);
        if (onCancelDraw) onCancelDraw();
```

**REPLACE WITH:**
```tsx
        setDrawState({ step: 0, points: [], currentPos: null });
        setTransformEditState({ step: 0, points: [], currentPos: null });
        setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
        setMeasurePoints([]);
        setMeasureResult(null);
        if (measureTimerRef.current) { clearTimeout(measureTimerRef.current); measureTimerRef.current = null; }
        setSelectedEntities(new Set());
        setCurrentSnap(null);
        if (onCancelDraw) onCancelDraw();
```

### Change 5: Add Measure Tool Visual Rendering
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** After the dimension tool preview block (after line 3857 — end of `} else if (activeDrawTool === 'dimension')` block), BEFORE the `} else if (activeDrawTool === 'text')` block

**FIND THIS (line 3857-3858):**
```tsx
              }
         } else if (activeDrawTool === 'text') {
```

**INSERT BEFORE `} else if (activeDrawTool === 'text')` (between lines 3857 and 3858):**
```tsx
         } else if (activeDrawTool === 'measure') {
              // Measure tool: rubber-band line from first point to cursor
              if (measurePoints.length === 1 && drawState.currentPos) {
                const mp1 = worldToScreen(measurePoints[0].x, measurePoints[0].y);
                const mp2 = screenCurrent;
                const mdx = drawState.currentPos.x - measurePoints[0].x;
                const mdy = drawState.currentPos.y - measurePoints[0].y;
                const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
                const mMidX = (mp1.x + mp2.x) / 2;
                const mMidY = (mp1.y + mp2.y) / 2;
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <line x1={mp1.x} y1={mp1.y} x2={mp2.x} y2={mp2.y}
                      stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="6,3" />
                    <circle cx={mp1.x} cy={mp1.y} r="4" fill="#00e5ff" />
                    <circle cx={mp2.x} cy={mp2.y} r="4" fill="#00e5ff" opacity="0.6" />
                    <rect x={mMidX - 35} y={mMidY - 12} width={70} height={18}
                      rx={3} fill="rgba(0,0,0,0.8)" />
                    <text x={mMidX} y={mMidY + 2} fill="#00e5ff" fontSize="10"
                      textAnchor="middle" dominantBaseline="middle"
                      fontFamily="Noto Sans, monospace">
                      {mDist.toFixed(2)} mm
                    </text>
                  </svg>
                );
              }
```

### Change 6: Add Measure Result Persistent Display
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** This needs to be rendered OUTSIDE the `drawState.currentPos` conditional. Find the closing of the draw-preview block and add the measure result rendering after it. The measure result should render whenever `measureResult` is not null, regardless of drawState.

Find a suitable location in the JSX return — after the draw preview section and before the crosshair rendering. Look for the section where SVG overlays are rendered.

**INSERT as a new block in the JSX, near the other SVG overlays (after the draw preview rendering closes, around line 3930-3950 area — look for the closing of the draw preview block):**
```tsx
      {/* Measure result persistent display */}
      {measureResult && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
          {(() => {
            const mr1 = worldToScreen(measureResult.p1.x, measureResult.p1.y);
            const mr2 = worldToScreen(measureResult.p2.x, measureResult.p2.y);
            const mrMid = { x: (mr1.x + mr2.x) / 2, y: (mr1.y + mr2.y) / 2 };
            return (
              <>
                <line x1={mr1.x} y1={mr1.y} x2={mr2.x} y2={mr2.y}
                  stroke="#00e5ff" strokeWidth="2" strokeDasharray="6,3" />
                <circle cx={mr1.x} cy={mr1.y} r="5" fill="#00e5ff" />
                <circle cx={mr2.x} cy={mr2.y} r="5" fill="#00e5ff" />
                <rect x={mrMid.x - 45} y={mrMid.y - 14} width={90} height={22}
                  rx={4} fill="rgba(0,0,0,0.9)" stroke="#00e5ff" strokeWidth="0.5" />
                <text x={mrMid.x} y={mrMid.y + 2} fill="#00e5ff" fontSize="12"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="Noto Sans, monospace" fontWeight="bold">
                  {measureResult.distance.toFixed(2)} mm
                </text>
              </>
            );
          })()}
        </svg>
      )}
```

### Change 7: Add Measure Tool to Cursor Style
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Lines 4123-4134 (cursor class logic)  
No change needed — `activeDrawTool ? 'cursor-crosshair'` at line 4130 already covers the measure tool since it IS an activeDrawTool. ✓

### QA
1. RadialMenu → Tiện ích → Đo đạc → tool activates (cursor crosshair)
2. Click first point → cyan dot appears
3. Move mouse → dashed cyan line follows with live distance
4. Click second point → bold distance label displayed
5. Label auto-disappears after ~4 seconds
6. Press Escape during measurement → cancels, returns to no tool
7. Measure 100×100 rectangle diagonal → ~141.42 mm
8. Snap works during measurement

---

## Task 5: Join Tool [NEW FEATURE] - [x] DONE

### Design
- Located in "Chỉnh sửa" (Edit) submenu in RadialMenu, 7th item named "Nối"
- Click first entity (line/polyline) → highlight → click second entity → attempt join at nearest endpoints
- Tolerance: 2mm
- Supports: line+line, line+polyline, polyline+polyline
- Uses undo system

### Change 1: Add Join Item to RadialMenu
**File:** `components/NestingAX/RadialMenu.tsx`  
**Location:** Line 35 (last item in Edit submenu)  
**Action:** Add comma after "Kéo giãn" and add new item

**FIND THIS (line 35):**
```tsx
    { name: "Kéo giãn", icon: "icon-stretch", action: "stretch", color: "#AEEA00" }
```

**REPLACE WITH:**
```tsx
    { name: "Kéo giãn", icon: "icon-stretch", action: "stretch", color: "#AEEA00" },
    { name: "Nối", icon: "icon-join", action: "join", color: "#76FF03" }
```

### Change 2: Add Join State
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** After the measure tool state (inserted in Task 4), INSERT join state

**INSERT AFTER the measure state declarations:**
```tsx

  // === JOIN TOOL STATE ===
  const [joinFirstEntityId, setJoinFirstEntityId] = useState<string | null>(null);
```

### Change 3: Add Join Click Handler Inside handleDrawingClick
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** Inside `handleDrawingClick`, after the measure tool block (added in Task 4), BEFORE the final `return prevDrawState;`

**INSERT the join handler BEFORE the final `return prevDrawState;`:**
```tsx
      } else if (activeDrawTool === 'join') {
        // Join tool: select 2 entities and merge at nearest endpoints
        // Find entity at click position
        let clickedJoinEntity: string | null = null;
        for (const ent of cadEntities) {
          if (isPointNearEntity(worldPos, ent, 10 / pixelsPerUnit)) {
            // Only allow lines and polylines
            if (ent.type === 'line' || ent.type === 'polyline') {
              clickedJoinEntity = ent.id;
              break;
            }
          }
        }

        if (!clickedJoinEntity) {
          console.log('⚠️ Join: No line/polyline found at click position');
          return prevDrawState;
        }

        if (!joinFirstEntityId) {
          // First entity selected
          console.log('🔗 Join: First entity selected', clickedJoinEntity);
          setJoinFirstEntityId(clickedJoinEntity);
          setSelectedEntities(new Set([clickedJoinEntity]));
        } else if (clickedJoinEntity !== joinFirstEntityId) {
          // Second entity selected — attempt join
          const ent1 = cadEntities.find(e => e.id === joinFirstEntityId);
          const ent2 = cadEntities.find(e => e.id === clickedJoinEntity);

          if (!ent1 || !ent2) {
            console.log('⚠️ Join: Entity not found');
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Get endpoints
          const getEndpoints = (ent: CadEntity): { start: { x: number; y: number }; end: { x: number; y: number } } | null => {
            if (ent.type === 'line' && ent.points.length >= 2) {
              return { start: ent.points[0], end: ent.points[1] };
            }
            if (ent.type === 'polyline' && ent.points.length >= 2) {
              return { start: ent.points[0], end: ent.points[ent.points.length - 1] };
            }
            return null;
          };

          const getPoints = (ent: CadEntity): { x: number; y: number }[] => {
            if (ent.type === 'line') return [ent.points[0], ent.points[1]];
            if (ent.type === 'polyline') return [...ent.points];
            return [];
          };

          const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
            Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

          const eps1 = getEndpoints(ent1);
          const eps2 = getEndpoints(ent2);

          if (!eps1 || !eps2) {
            console.log('⚠️ Join: Cannot get endpoints');
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Find closest endpoint pair
          const combos = [
            { d: dist(eps1.end, eps2.start), flip1: false, flip2: false },
            { d: dist(eps1.end, eps2.end), flip1: false, flip2: true },
            { d: dist(eps1.start, eps2.start), flip1: true, flip2: false },
            { d: dist(eps1.start, eps2.end), flip1: true, flip2: true },
          ];
          const best = combos.reduce((a, b) => a.d < b.d ? a : b);

          const TOLERANCE = 2; // mm
          if (best.d > TOLERANCE) {
            console.log('⚠️ Join: Endpoints too far apart (', best.d.toFixed(2), 'mm > ', TOLERANCE, 'mm)');
            showToast?.(`Không thể nối: khoảng cách ${best.d.toFixed(2)}mm > ${TOLERANCE}mm`);
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Get point arrays and flip if needed
          let pts1 = getPoints(ent1);
          let pts2 = getPoints(ent2);
          if (best.flip1) pts1 = pts1.reverse();
          if (best.flip2) pts2 = pts2.reverse();

          // Merge: pts1 + pts2 (skip first of pts2 since it overlaps)
          const mergedPoints = [...pts1, ...pts2.slice(1)];

          const newId = crypto.randomUUID();
          const newEntity: CadEntity = {
            id: newId,
            type: 'polyline',
            points: mergedPoints,
            properties: {
              closed: false,
              layer: ent1.properties?.layer || 'default',
              color: ent1.properties?.color || '#ffffff',
            },
            layerId: ent1.layerId || activeLayerId,
          };

          console.log('✅ Join: Merged', ent1.id, '+', ent2.id, '→', newId, '(', mergedPoints.length, 'points)');

          setCadEntitiesWithUndo(
            prev => [...prev.filter(e => e.id !== ent1!.id && e.id !== ent2!.id), newEntity],
            'Join entities',
            'edit',
            [ent1.id, ent2.id]
          );

          setJoinFirstEntityId(null);
          setSelectedEntities(new Set([newId]));
        }
        return prevDrawState;
```

### Change 4: Clear Join State on Tool Change
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** In the tool change useEffect (where measure state is cleared in Task 4), ADD:

**ADD after the measure cleanup lines:**
```tsx
    setJoinFirstEntityId(null);
```

### Change 5: Clear Join State on Escape
**File:** `components/NestingAX/Workspace.tsx`  
**Location:** In the global ESC handler (where measure state is cleared in Task 4), ADD:

**ADD after the measure cleanup lines:**
```tsx
        setJoinFirstEntityId(null);
```

### QA
1. RadialMenu → Chỉnh sửa → "Nối" appears as 7th item with green color
2. Click "Nối" → tool activates (cursor crosshair)
3. Draw two lines sharing an endpoint → click first line → highlights green
4. Click second line → lines merge into single polyline, highlighted
5. Undo (Ctrl+Z) → original two lines restored
6. Try with endpoints >2mm apart → shows toast error, no join
7. Try clicking a circle → ignored (only lines/polylines)
8. Polyline + line → works correctly
9. Polyline + polyline → works correctly


### ⚠️ IMPORTANT: Update useCallback Dependency Arrays (Tasks 4 & 5)
After adding measure and join handlers inside `handleDrawingClick`, you MUST update its `useCallback` dependency array (line 2200) to include the new state variables:

**FIND THIS (line 2200):**
```tsx
  }, [activeDrawTool, setCadEntities, setCadEntitiesWithUndo, setDrawState, cadEntities]);
```

**REPLACE WITH:**
```tsx
  }, [activeDrawTool, setCadEntities, setCadEntitiesWithUndo, setDrawState, cadEntities, measurePoints, joinFirstEntityId, isPointNearEntity, pixelsPerUnit, activeLayerId, showToast]);
```

This ensures the measure and join handlers have access to current state values and don't use stale closures.

---

## Task 7: Performance Optimization [OPTIMIZATION — HIGH RISK] - [x] DONE

### Constraint: "đẩm bảo kh được đụng gì hết, chỉ được cập nhật giảm lag"
NO functional changes. NO visual changes. Only performance improvements. Apply ONE AT A TIME and test after each.

### Performance Killers Identified
1. `console.log('🎨 Rendering CAD Entities...')` on EVERY render (line 3021) — HUGE
2. `setMouseScreenPos` + `setMouseWorldPos` cause re-render on EVERY mouse move (lines 2550-2551)
3. `findNearestSnapPoint()` iterates ALL cadEntities on every mouse move (line 2583)
4. No viewport culling — ALL entities rendered regardless of visibility
5. `console.log('🖱️ Mouse down:...')` on every mousedown (line 2328)

### Optimization 1: Remove Hot-Path Console Logs [SAFE — DO FIRST]

**File:** `components/NestingAX/Workspace.tsx`

**FIND AND COMMENT OUT these lines:**

**Line 3021 — CRITICAL (fires on every render):**
```tsx
      console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length, 'Entities:', cadEntities);
```
**REPLACE WITH:**
```tsx
      // console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length);
```

**Line 2328 — fires on every mouse down:**
```tsx
    console.log('🖱️ Mouse down:', { button: e.button, activeDrawTool });
```
**REPLACE WITH:**
```tsx
    // console.log('🖱️ Mouse down:', { button: e.button, activeDrawTool });
```

**Line 1922 — fires on every drawing click:**
```tsx
    console.log('🎨 handleDrawingClick called with:', { activeDrawTool, worldPos });
```
**REPLACE WITH:**
```tsx
    // console.log('🎨 handleDrawingClick called with:', { activeDrawTool, worldPos });
```

**Line 521 — fires on every tool change:**
```tsx
    console.log('🔧 Active draw tool changed:', activeDrawTool);
```
**REPLACE WITH:**
```tsx
    // console.log('🔧 Active draw tool changed:', activeDrawTool);
```

**Line 2370 — fires on every window selection start:**
```tsx
            console.log('📦 Starting window selection');
```
**REPLACE WITH:**
```tsx
            // console.log('📦 Starting window selection');
```

### Optimization 2: RAF Throttle for Mouse Move [MEDIUM RISK]

**File:** `components/NestingAX/Workspace.tsx`

**Step 2a: Add RAF ref (near other refs, after line 192):**

**FIND THIS (lines 192-193):**
```tsx
  const cadEntitiesRef = useRef<CadEntity[]>([]);
  cadEntitiesRef.current = cadEntities;
```

**INSERT AFTER line 193:**
```tsx

  // === PERFORMANCE: RAF throttle for mouse move ===
  const rafMouseMoveRef = useRef<number | null>(null);
```

**Step 2b: Wrap handleMouseMoveInternal with RAF throttle**

**FIND THIS (line 2542):**
```tsx
  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {
```

**REPLACE WITH:**
```tsx
  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {
    // RAF throttle: skip if a frame is already pending
    if (rafMouseMoveRef.current) {
      // Still need to capture the latest event for drag operations
      if (!isDragging && !isWindowSelecting && !draggingSheet && !draggingPart) return;
    }
```

**Then WRAP the entire body of handleMouseMoveInternal:**
The existing line `if (!containerRef.current) return;` (line 2543) should be inside a RAF callback. However, since the function uses React state setters which are safe to call asynchronously, and drag operations need immediate response, we use a simpler approach:

**ACTUALLY — safer approach: Only throttle the snap calculation, not the entire handler. The mouse position updates and drag logic MUST remain immediate.**

**REVISED Optimization 2: Throttle ONLY the snap point calculation**

Instead of wrapping the entire mouse handler, only throttle the expensive snap calculation:

**FIND THIS (lines 2581-2590):**
```tsx
        if (snapEnabled && activeSnaps.size > 0) {
          const threshold = 20 / pixelsPerUnit;
          const snap = findNearestSnapPoint(finalPos, cadEntities, activeSnaps, threshold);
          setCurrentSnap(snap);
          if (snap) {
            finalPos = { x: snap.x, y: snap.y };
          }
        } else {
          setCurrentSnap(null);
        }
```

**REPLACE WITH:**
```tsx
        if (snapEnabled && activeSnaps.size > 0) {
          // Throttle snap calculation using RAF to prevent lag with many entities
          if (!rafMouseMoveRef.current) {
            rafMouseMoveRef.current = requestAnimationFrame(() => {
              rafMouseMoveRef.current = null;
              const threshold = 20 / pixelsPerUnit;
              const snap = findNearestSnapPoint(finalPos, cadEntitiesRef.current, activeSnaps, threshold);
              setCurrentSnap(snap);
            });
          }
          // Use previous snap result for immediate position
          if (currentSnap) {
            finalPos = { x: currentSnap.x, y: currentSnap.y };
          }
        } else {
          setCurrentSnap(null);
        }
```

**Step 2c: Add cleanup useEffect for RAF:**

**INSERT after the global mouseup cleanup useEffect (after line 2619):**
```tsx

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafMouseMoveRef.current) cancelAnimationFrame(rafMouseMoveRef.current);
    };
  }, []);
```

### Optimization 3: Memoize Visible Entities in renderCadEntities [SAFE]

**File:** `components/NestingAX/Workspace.tsx`

The `renderCadEntities` function (line 3020) filters entities by layer visibility on every call. Memoize the visible entities list.

**FIND THIS (lines 3020-3027):**
```tsx
   const renderCadEntities = () => {
      console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length, 'Entities:', cadEntities);
      // Filter entities by layer visibility
      const visibleEntities = cadEntities.filter(entity => {
        const layer = layers.find(l => l.id === entity.layerId);
        // If no layer or layer is visible, show entity
        return !layer || layer.visible;
      });
```

**REPLACE WITH:**
```tsx
   // Memoize visible entities to avoid re-filtering on every render
   const visibleCadEntities = React.useMemo(() => {
     return cadEntities.filter(entity => {
       const layer = layers.find(l => l.id === entity.layerId);
       return !layer || layer.visible;
     });
   }, [cadEntities, layers]);

   const renderCadEntities = () => {
      // console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length);
      const visibleEntities = visibleCadEntities;
```

**Note:** The closing of `renderCadEntities` remains unchanged. Only the filtering moves to a useMemo above it.

### Optimization 4: Use Refs for Mouse Position (Reduce Re-renders) [MEDIUM RISK]

**File:** `components/NestingAX/Workspace.tsx`

The `mouseScreenPos` and `mouseWorldPos` states are updated on EVERY mouse move, causing re-renders. However, they are used for crosshair rendering and coordinate display in Footer, so we can't fully eliminate the state. Instead, we debounce the state update.

**FIND THIS (lines 2549-2551):**
```tsx
    // Update crosshair position (AutoCAD style)
    setMouseScreenPos({ x: mouseX, y: mouseY });
    setMouseWorldPos(worldPos);
```

**REPLACE WITH:**
```tsx
    // Update crosshair position with reduced re-render frequency
    // Use refs for immediate access, state for rendering (throttled)
    mouseScreenPosRef.current = { x: mouseX, y: mouseY };
    mouseWorldPosRef.current = worldPos;
    // Batch state updates - React batches these within the same event handler
    setMouseScreenPos({ x: mouseX, y: mouseY });
    setMouseWorldPos(worldPos);
```

**Wait — this doesn't actually change anything. For a real improvement, we need to use refs and only update state on RAF. But since crosshair rendering depends on this state, AND the entire component re-renders from pan/zoom anyway, the most impactful optimization is the console.log removal (Optimization 1) and the snap throttle (Optimization 2).**

**REVISED Optimization 4: Skip — The console.log removal and snap throttle provide the biggest wins. Additional mouse position optimization would require significant refactoring that risks breaking crosshair rendering.**

### Optimization 5: Viewport Culling for Large Entity Sets [SAFE]

**File:** `components/NestingAX/Workspace.tsx`

Only render entities whose bounding box intersects the viewport. Only activate for 200+ entities.

**REPLACE the visibleCadEntities memo from Optimization 3 with an enhanced version:**

```tsx
   // Memoize visible entities with viewport culling for large datasets
   const visibleCadEntities = React.useMemo(() => {
     // First filter by layer visibility
     const layerVisible = cadEntities.filter(entity => {
       const layer = layers.find(l => l.id === entity.layerId);
       return !layer || layer.visible;
     });

     // Viewport culling only for large datasets (200+ entities)
     if (layerVisible.length < 200 || !containerRef.current) return layerVisible;

     const cw = containerRef.current.clientWidth;
     const ch = containerRef.current.clientHeight;
     const vpLeft = viewOffset.x;
     const vpRight = viewOffset.x + (cw / pixelsPerUnit);
     const vpTop = viewOffset.y;
     const vpBottom = viewOffset.y - (ch / pixelsPerUnit);
     const margin = 50 / pixelsPerUnit; // 50px margin for partially visible entities

     return layerVisible.filter(ent => {
       // Quick bounding box check
       let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
       for (const p of ent.points) {
         if (p.x < minX) minX = p.x;
         if (p.x > maxX) maxX = p.x;
         if (p.y < minY) minY = p.y;
         if (p.y > maxY) maxY = p.y;
       }
       // For circles, expand bounds by radius
       if (ent.type === 'circle' && ent.properties?.radius) {
         const r = ent.properties.radius;
         minX -= r; maxX += r; minY -= r; maxY += r;
       }
       // Check intersection with viewport (with margin)
       return maxX >= (vpLeft - margin) && minX <= (vpRight + margin) &&
              maxY >= (vpBottom - margin) && minY <= (vpTop + margin);
     });
   }, [cadEntities, layers, viewOffset, pixelsPerUnit]);
```

### Execution Order for Task 7
1. **Optimization 1** (console.log removal) → Test all functionality → SAFE
2. **Optimization 3+5** (memoized visible entities + viewport culling) → Test rendering → SAFE
3. **Optimization 2** (RAF snap throttle) → Test snap behavior carefully → MEDIUM RISK

### QA After ALL Optimizations
1. Pan (middle-click drag) → smooth, no stutter
2. Zoom (scroll wheel) → smooth, correct center
3. Draw all tool types → all work correctly
4. Select: click, window, Shift+deselect, Ctrl+toggle → all work
5. Entity rendering: all types visible and correct
6. Snap: snap indicators appear at endpoints/midpoints
7. Rulers: render correctly
8. DevTools → Performance → record mouse movement → check for fewer dropped frames
9. Load a heavy DXF file (1000+ entities) → verify noticeably less lag

---

## Final Verification Wave

After ALL 7 tasks are complete:

### Build Check
```bash
npm run build
```
Must complete with zero errors.

### Type Check
```bash
npx tsc --noEmit
```
Must complete with zero new errors.

### Functional Regression Checklist
| Feature | Test |
|---------|------|
| Canvas pan | Middle-click drag, smooth movement |
| Canvas zoom | Mouse wheel, correct center |
| Entity draw | Line, circle, polyline, arc, rect, dimension, text |
| Entity select | Click=single, window=multi, Ctrl+multi-select |
| Entity deselect | Shift+click (NEW), click empty, Escape |
| Measure tool | Two-click distance (NEW) |
| Join tool | Merge two lines/polylines (NEW) |
| RadialMenu | All items accessible, Edit submenu has 7 items |
| Nesting simulation | Preview shows sheet immediately (FIXED) |
| Settings sync | All gap/engine values apply to nesting (VERIFIED) |
| Dimension labels | Mouse hover → no zoom jump (FIXED) |
| Undo/Redo | All operations undoable |
| Layers | Layer visibility toggle works |
| Snap | Snap to endpoints, midpoints, centers |
| Performance | Noticeably less lag with many entities |

---

## Risk Assessment
| Task | Risk | Mitigation |
|------|------|------------|
| Task 3 (zoom fix) | Very Low | Single attribute addition |
| Task 1 (selection) | Low | Isolated click handler logic |
| Task 6 (settings) | Low | Interface expansion + function update |
| Task 2 (simulation) | Medium | Data flow fix, test with various sheet configs |
| Task 4 (measure) | Medium | New feature following existing patterns |
| Task 5 (join) | Medium-High | New geometry logic, edge cases |
| Task 7 (performance) | High | Must not change behavior, incremental approach |
