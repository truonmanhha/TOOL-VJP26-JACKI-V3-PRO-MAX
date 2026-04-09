# 🔧 FIX PLAN - 4 CRITICAL BUGS

## BUG 1: Dimension Parsing (1220,2440 → Polygon instead of Rectangle)

### Current Code (Lines 205-214):
```typescript
if (currentCommand === 'RECTANGLE' && typeof parsed !== 'number') {
    const corner2 = parsed.relative ? { x: lastPt.x + parsed.x, y: lastPt.y + parsed.y } : parsed;
    // Creates rectangle from corner1 to corner2
}
```

### Problem:
Input `1220,2440` is parsed as **coordinates** `{x: 1220, y: 2440}`, NOT dimensions.

### Fix Required:
```typescript
// NEW: Detect if command is RECTANGLE and no points yet
if (currentCommand === 'RECTANGLE' && commandPoints.length === 0 && typeof parsed !== 'number') {
    // Input is "width,height" - create rectangle at origin with these dimensions
    const corner1 = { x: 0, y: 0 };
    const corner2 = { x: parsed.x, y: parsed.y };
    // Create rectangle...
}
```

---

## BUG 2: Wrong Modal Trigger (Right-Click opens NewNestList instead of PartParameters)

### Current Code (Lines 724-729):
```typescript
const handleFinishSelection = useCallback(() => {
    if (isSelectingParts) {
        setIsSelectingParts(false);
        setIsNewNestListOpen(true); // ❌ WRONG MODAL!
        setSelectedIds(new Set());
    }
```

### Fix Required:
```typescript
const handleFinishSelection = useCallback(() => {
    if (isSelectingParts) {
        // Right-click should open Part Parameters Dialog, NOT main modal
        if (selectedIds.size > 0) {
            handleConfirmPartSelection(); // Opens Part Params Dialog
        } else {
            // No selection, just exit mode
            setIsSelectingParts(false);
            setIsNewNestListOpen(true);
        }
    }
```

---

## BUG 3: Radial Menu Conflict (Already partially fixed)

### Current Status:
- App.tsx: ✅ Has suppression logic
- BUT: Need to also check `currentCommand` state

### Fix Required:
Add to `isNestingSelectionMode` calculation:
```typescript
const isInSelectionMode = isSelectingParts || isSelectingSheet || ['LINE', 'CIRCLE', 'RECTANGLE', 'POLYLINE'].includes(currentCommand);
```

---

## BUG 4: Auto-Add Bug (Objects auto-add to Panel 2)

### Investigation Needed:
Search for any code that automatically adds entities to `newNestListParts` without user confirmation.

### Expected Logic:
```
Draw object → Save to `entities` (canvas)
              ↓
              WAIT for user action
              ↓
User selects → ENTER → Part Params Dialog → OK → Add to `newNestListParts`
```

### Must NOT happen:
```
Draw object → Auto-add to `newNestListParts` ❌
```

---

**Priority Order:**
1. BUG 2 (Wrong modal) - Critical UX issue
2. BUG 1 (Dimension parsing) - Breaks drawing workflow  
3. BUG 3 (Radial Menu) - Partially fixed, need enhancement
4. BUG 4 (Auto-add) - Need to find code first

**Next Action:** Implement fixes one by one
