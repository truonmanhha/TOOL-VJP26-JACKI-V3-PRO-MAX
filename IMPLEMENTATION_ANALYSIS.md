# VJP26 NestingAX Multi-Feature Implementation Analysis

**Date**: Feb 24, 2026 | **Status**: Implementation In Progress (3 parallel agents)

---

## Executive Summary

Four major feature updates requested for NestingAX interface:

1. **RadialMenu Enhancement**: Click-outside close + delete tool two-state logic
2. **Sheet Movement**: Enable AlphaCAM-style sheet dragging (remove pinning)
3. **Footer Restructuring**: Move Footer 1 outside Workspace to sibling level
4. **Verification & Testing**: Ensure all features work and diagnostics pass

**Agents Deployed**: 3 Sisyphus-Junior instances (ultrabrain category)
- `bg_2b8ae2ac`: RadialMenu + Delete Tool
- `bg_d6edd771`: Sheet Movement/Dragging
- `bg_02181d41`: Footer Layout Restructuring

---

## Architecture Analysis

### Current State

#### RadialMenu (RadialMenu.tsx)
- ✅ **Click-outside detection EXISTS**: Lines 305-320
  - `handleOutsideClick` callback registered on document
  - Checks `containerRef.current?.contains(e.target as Node)`
  - Calls `onClose()` if outside detected
  - 100ms delay to avoid catching initial right-click

- ❌ **Delete tool lacks two-state logic**: Currently in Workspace.tsx lines 548-570
  - Activates deletion if `selectedEntities.size > 0`
  - Shows toast if nothing selected ("Select entities first!")
  - No automatic selection mode activation

#### Sheet Handling (Workspace.tsx)
- ✅ **Sheet creation**: Works via `onAddSheet` callback
- ❌ **Sheet movement**: NOT implemented
  - `draggingSheet` state declared (line 369) but NEVER used
  - `getContentBounds` uses `yCursor` auto-layout: `sheet.y ?? yCursor`
  - No selection state for sheets
  - No drag handlers on sheet elements

#### Footer Layout (NestingAXApp.tsx)
- ✅ **Footer is correctly positioned as sibling** (line 562)
  - Rendered OUTSIDE the workspace flex container
  - Already at bottom of app hierarchy
  - Proper h-6 fixed height styling

- ⚠️ **Potential internal footer in Workspace**: Need verification
  - Check if Workspace.tsx renders footer-like component internally
  - If exists, must be removed to avoid duplication

---

## Implementation Details

### 1. RadialMenu Click-Outside Enhancement ✅ Already Working

**Current Implementation** (RadialMenu.tsx lines 305-320):
```typescript
// Delay một chút để tránh catch ngay click phải đã mở menu
const t = setTimeout(() => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('contextmenu', handleContextMenu);
}, 100);
```

**Status**: ✅ Already functional. No changes needed.

### 2. Delete Tool Two-State Logic 🔧 Implementation Target

**Current Code** (Workspace.tsx lines 548-570):
```typescript
// === DELETE TOOL: When activeDrawTool === 'delete', delete selected entities or show toast ===
useEffect(() => {
  if (activeDrawTool !== 'delete') return;

  if (selectedEntities.size > 0) {
    const toDelete = Array.from(selectedEntities);
    setCadEntitiesWithUndo(
      cadEntities.filter(e => !toDelete.includes(e.id)),
      'delete',
      'Delete selected entities'
    );
    setSelectedEntities(new Set());
  } else {
    showToast('Select entities first!');
  }
}, [activeDrawTool]);
```

**Required Changes**:
```typescript
// State A: If selected, delete immediately
// State B: If not selected, activate select mode
const handleDeleteTool = useCallback(() => {
  if (selectedEntities.size > 0) {
    // Delete immediately
    const toDelete = Array.from(selectedEntities);
    setCadEntitiesWithUndo(
      cadEntities.filter(e => !toDelete.includes(e.id)),
      'delete',
      'Delete selected entities'
    );
    setSelectedEntities(new Set());
    showToast('Entities deleted');
  } else {
    // Activate select mode
    onSelectTool?.('select');
    showToast('Select entities to delete. Right-click to delete selected.');
  }
}, [selectedEntities.size, activeDrawTool]);
```

### 3. Sheet Movement Implementation 🔧 Implementation Target

**Current Pinning Logic** (Workspace.tsx lines 3443-3450):
```typescript
const pos = worldToScreen(sheetWorldX, sheetWorldY + sh); 
const wPx = sw * pixelsPerUnit;
const hPx = sh * pixelsPerUnit;

<div key={sheet.id} className="..." style={{
  left: pos.x, top: pos.y, width: wPx, height: hPx,
  cursor: !activeDrawTool ? 'move' : undefined,
}}
```

**Required Changes**:
1. Add `selectedSheets` state
2. Implement drag handlers:
   - `onMouseDown`: Set dragging state, store origin coordinates
   - `onMouseMove`: Calculate delta, update sheet position via `onUpdateSheet`
   - `onMouseUp`: Clear dragging state
3. Remove yCursor auto-layout (change `sheet.y ?? yCursor` to `sheet.y ?? 0`)

### 4. Footer Layout ✅ Already Correct

**Current Structure** (NestingAXApp.tsx):
```
<div className="flex flex-col h-screen">
  <Header className="h-[67px]" />
  <div className="flex flex-1 overflow-hidden">
    <Workspace />
  </div>
  <Footer className="h-6" />
</div>
```

**Status**: ✅ Footer is already correctly positioned as sibling. No structural changes needed. Just verify no internal footer in Workspace.tsx.

---

## Implementation Status

| Task | Agent | Status | ETA |
|------|-------|--------|-----|
| RadialMenu Click-Outside | bg_2b8ae2ac | ✅ RUNNING | ~3 min |
| Delete Tool Two-State | bg_2b8ae2ac | ✅ RUNNING | ~3 min |
| Sheet Movement | bg_d6edd771 | ✅ RUNNING | ~5 min |
| Footer Layout | bg_02181d41 | ✅ RUNNING | ~2 min |
| Verification & Testing | PENDING | ⏳ QUEUED | After agents done |

---

## Files Modified

Expected modifications:
- ✏️ `components/NestingAX/RadialMenu.tsx` (minimal - verify click-outside works)
- ✏️ `components/NestingAX/Workspace.tsx` (major - delete tool + sheet movement)
- ✏️ `components/NestingAX/services/db.ts` (possibly - if sheet interface needs update)
- ✏️ `components/NestingAXApp.tsx` (minimal - verify footer layout)

---

## Testing Checklist

After implementation:

### RadialMenu
- [ ] Right-click in workspace → menu appears
- [ ] Click outside menu → menu closes
- [ ] Delete tool with selection → entities delete
- [ ] Delete tool without selection → switch to select mode (toast shows)

### Sheet Movement
- [ ] Click on sheet → sheet is selectable
- [ ] Drag sheet → position updates in real-time
- [ ] Release → position persists in db
- [ ] Can drag multiple times

### Footer Layout
- [ ] Header at top
- [ ] Workspace expands to fill space
- [ ] Footer at bottom, touching workspace
- [ ] No gaps or duplication

### Type Checking
- [ ] `npx tsc --noEmit` passes
- [ ] No `as any` used
- [ ] No `@ts-ignore` used

---

## Risk Assessment

**Low Risk**:
- RadialMenu click-outside already exists
- Footer already correctly positioned

**Medium Risk**:
- Delete tool state machine needs careful testing
- Sheet dragging introduces new interaction logic

**No Breaking Changes Expected**: Only adding new functionality to existing components.

---

**Next Step**: Monitor agent progress. When all 3 agents complete → run verification and testing (Todo 4).
