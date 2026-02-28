# NestingAX Preview Fix Plan
**Objective:** Fix complex shapes (vase, spirals, etc.) being simplified to square bounding boxes in the sidebar preview.

---

## Root Cause Analysis

### Issue 1: Missing `cadEntities` in Part Model (Data Pipeline Bug)
**File:** `components/NestingAX/services/db.ts` (Line 11-34)

The `Part` interface declares `cadEntities?` for CAD data, but this field is NEVER populated when parts are created from `AutoPartCreation.ts`.

**Flow (BROKEN):**
```
createPartFromSelection() 
  → creates PartItem with geometry: normalizedEntities (the CAD data!) 
  → passed to handleAddPart() as partData 
  → DB receives it as newPart 
  → Database stores Part WITHOUT the cadEntities field 
  → Sidebar/PartListPanel reads Part from DB, cadEntities is undefined 
  → Preview falls back to dimensions string "WxH" 
  → VectorPreview renders only a rectangle bounding box
```

### Issue 2: PartListPanel Uses Wrong Geometry Format
**File:** `components/nesting/PartListPanel.tsx` (Line 164-177)

The preview attempts to access `(part as any).cadEntities`, but since DB doesn't store it, the fallback generates a rectangle from `part.geometry` (which doesn't exist in the Part interface).

---

## Solution Overview

### Phase 1: Fix Data Pipeline (Required)
Map the `geometry` field from `PartItem` → `cadEntities` field in `Part` during the add operation.

### Phase 2: Fix Preview Component Logic (Defensive)
Ensure the PartListPanel correctly extracts and displays the complex geometry.

---

## Implementation Details

### FIX #1: Map geometry → cadEntities in AutoPartCreation.ts
**File:** `components/NestingAX/AutoPartCreation.ts`

**Current Code (Line 94-95):**
```typescript
const geometry = cadEntitiesToGeometry(normalizedEntities);
const thumbnail = generateThumbnail(geometry, 200, 200);
```

**Problem:** `PartItem.geometry` is assigned `normalizedEntities` (array of CAD entities), but this field is never passed to the database as `cadEntities`.

**COPY-PASTE FIX:**

Replace the returned `newPart` object in `createPartFromSelection()` (lines 101-115):

**BEFORE:**
```typescript
const newPart: PartItem = {
  id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: `Part_${partCount + 1}`,
  size: { 
    width: parseFloat(width.toFixed(2)), 
    height: parseFloat(height.toFixed(2)) 
  },
  quantity: 1,
  priority: 3,
  symmetry: 'none',
  rotation: 'any',
  isSmallPart: false,
  geometry: normalizedEntities,
  thumbnail
};
```

**AFTER (Keep geometry AND add cadEntities):**
```typescript
const newPart: PartItem = {
  id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: `Part_${partCount + 1}`,
  size: { 
    width: parseFloat(width.toFixed(2)), 
    height: parseFloat(height.toFixed(2)) 
  },
  quantity: 1,
  priority: 3,
  symmetry: 'none',
  rotation: 'any',
  isSmallPart: false,
  geometry: normalizedEntities,  // Keep for backward compat
  cadEntities: normalizedEntities,  // ← ADD THIS: Store CAD data for preview
  thumbnail
};
```

### FIX #2: Update PartItem Interface to Include cadEntities
**File:** `components/NestingAX/AutoPartCreation.ts` (Lines 15-26)

**Current Code:**
```typescript
interface PartItem {
  id: string;
  name: string;
  size: { width: number; height: number };
  quantity: number;
  priority: number;
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
  rotation: 'none' | '90' | '180' | 'any';
  isSmallPart: boolean;
  geometry: any;
  thumbnail?: string;
}
```

**AFTER (Add cadEntities field):**
```typescript
interface PartItem {
  id: string;
  name: string;
  size: { width: number; height: number };
  quantity: number;
  priority: number;
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
  rotation: 'none' | '90' | '180' | 'any';
  isSmallPart: boolean;
  geometry: any;
  cadEntities?: any[];  // ← ADD THIS: Store CAD entities
  thumbnail?: string;
}
```

### FIX #3: Update Workspace.tsx to Pass cadEntities Correctly
**File:** `components/NestingAX/Workspace.tsx` (Line 1187-1200)

The code already prepares `cadEntities` correctly, so ensure it's passed as-is to the Part:

**VERIFY (Line 1197):**
```typescript
cadEntities: entitiesToUse,  // ← This line is correct!
```

No changes needed here—it's already correct. The bug is in AutoPartCreation.ts.

### FIX #4: Update PartListPanel Fallback Logic (Defensive Programming)
**File:** `components/nesting/PartListPanel.tsx` (Line 164-177)

**Current Code:**
```typescript
<VectorPreview
  geometry={(() => {
    if ((part as any).cadEntities?.length > 0) {
      const geo = cadEntitiesToGeometry((part as any).cadEntities);
      if (geo.paths.length > 0) return geo;
    }
    return { paths: [{ type: 'polyline' as const, points: part.geometry }] };
  })()}
  width={32}
  height={32}
/>
```

**AFTER (Better fallback to bounding box if no CAD data):**
```typescript
<VectorPreview
  geometry={(() => {
    // Try CAD entities first (complex shapes)
    if ((part as any).cadEntities?.length > 0) {
      try {
        const geo = cadEntitiesToGeometry((part as any).cadEntities);
        if (geo.paths.length > 0) {
          console.log('✅ PartListPanel: Using cadEntities for', part.name);
          return geo;
        }
      } catch (err) {
        console.warn('⚠️ PartListPanel: cadEntitiesToGeometry failed:', err);
      }
    }
    
    // Fallback: Generate rectangle from dimensions
    const dims = part.dimensions?.split('x').map(d => parseFloat(d.trim())) || [0, 0];
    if (dims.length === 2 && !isNaN(dims[0]) && !isNaN(dims[1])) {
      const [w, h] = dims;
      console.log('📐 PartListPanel: Generating rectangle fallback for', part.name, ':', w, 'x', h);
      return {
        paths: [{
          type: 'polyline' as const,
          points: [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
            { x: 0, y: 0 }
          ],
          isRapid: false
        }]
      };
    }
    
    // Final fallback: Empty geometry
    return { paths: [] };
  })()}
  width={32}
  height={32}
/>
```

---

## Testing Checklist

- [ ] **Test 1:** Select a vase shape → Create part → Verify sidebar preview shows vase, not square
- [ ] **Test 2:** Create a spiral/complex shape → Verify detailed geometry in 8x8px thumbnail
- [ ] **Test 3:** Check console logs confirm `cadEntities` is stored and retrieved
- [ ] **Test 4:** Verify simple rectangular parts still work (fallback logic)
- [ ] **Test 5:** Reload page → Parts should still show complex geometry (data persisted)

---

## Files Modified

1. `components/NestingAX/AutoPartCreation.ts`
   - Update `PartItem` interface (add `cadEntities` field)
   - Update `createPartFromSelection()` return object (populate `cadEntities`)

2. `components/nesting/PartListPanel.tsx`
   - Improve fallback logic for geometry rendering (optional, defensive)

---

## Notes

- **Backward Compatibility:** The `geometry` field is kept for backward compatibility. Some code may still reference it.
- **Data Persistence:** `cadEntities` is already defined in the `Part` interface in `db.ts`, so localStorage will persist it automatically.
- **Console Logging:** The app already logs extensively. Search for "Using cadEntities" or "cadEntitiesToGeometry failed" to debug.

---

## Coordinate Bug Note

The brief mentioned a "coordinate bug" but based on code analysis, the main issue is the data pipeline. VectorPreview correctly:
- Calculates bounding boxes (lines 72-85)
- Auto-scales geometry to fit canvas (lines 111-128)
- Transforms coordinates with scale and offset (lines 127-128, 169-170)

If coordinates are inverted or mirrored, check:
- Y-axis orientation (SVG/Canvas may differ)
- Point normalization in `AutoPartCreation.ts` (lines 84-90)
