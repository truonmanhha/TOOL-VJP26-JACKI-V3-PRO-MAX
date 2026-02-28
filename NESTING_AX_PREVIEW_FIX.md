# ✅ NESTING AX - PREVIEW & FLOW FIX

## 🎯 Vấn đề đã fix

### 1️⃣ **Flow sai: New Nest List modal hiện ngay sau Add Part**
**Trước:**
```
User chọn objects → Add Part dialog mở 
→ User nhập thông tin → Click OK 
→ ❌ New Nest List modal MỞ NGAY (chồng lên nhau)
```

**Sau:**
```
User chọn objects → Add Part dialog mở 
→ User nhập thông tin → Click OK 
→ ✅ Dialog đóng, user tự mở lại New Nest List khi cần
```

### 2️⃣ **Preview vector trống trong Add Part dialog**
**Vấn đề:** Không có geometry data được truyền vào VectorPreview component

---

## 🔧 Changes Made

### **1. NestingAXApp.tsx - Flow Control**

#### ❌ Old Code (Line 220):
```tsx
const handleAddPart = (partData: Omit<Part, 'id' | 'nestListId'>) => {
    if (!activeListId) return;
    const newPart = db.addPart({ ...partData, nestListId: activeListId });
    setCurrentParts([...currentParts, newPart]);
    setShowPartParamsModal(false);
    setShowModal(true); // ← Mở ngay New Nest List modal!
};
```

#### ✅ New Code:
```tsx
const handleAddPart = (partData: Omit<Part, 'id' | 'nestListId'>) => {
    if (!activeListId) return;
    const newPart = db.addPart({ ...partData, nestListId: activeListId });
    setCurrentParts([...currentParts, newPart]);
    setShowPartParamsModal(false);
    // ✅ FIX: Don't auto-open modal, let user decide
    // User can manually open modal from sidebar or by clicking nest list
};
```

#### Optional Auto-Reopen (Line 209):
```tsx
const handleClosePartParams = () => {
    setShowPartParamsModal(false);
    setIsSelecting(false);
    // ✅ Option: Reopen nest list modal after closing part params
    // Uncomment if you want auto-reopen behavior:
    // setTimeout(() => setShowModal(true), 300);
};
```

---

### **2. Workspace.tsx - Import VectorPreview**

```tsx
import VectorPreview, { cadEntitiesToGeometry } from '../nesting/NewNestList/VectorPreview';
```

---

### **3. Workspace.tsx - Add Geometry State**

```tsx
const [selectedPartGeometry, setSelectedPartGeometry] = useState<CadEntity[] | null>(null);
```

---

### **4. Workspace.tsx - Store Geometry on Modal Open**

```tsx
useEffect(() => {
  if (showPartParamsModal) {
    setFormPartName(`Part_${parts.length + 1}`);
    // ... other resets ...
    
    // ✅ Store selected entities geometry for preview
    const selected = cadEntities.filter(e => selectedEntities.has(e.id));
    console.log('🔍 Selected entities for preview:', selected);
    console.log('📊 Entity structure sample:', selected[0]);
    setSelectedPartGeometry(selected);
  }
}, [showPartParamsModal, parts.length, cadEntities, selectedEntities]);
```

---

### **5. Workspace.tsx - Render VectorPreview**

#### ❌ Old Code (Line 2007):
```tsx
<div className="w-[200px] flex flex-col">
    <div className="text-center mb-1 text-gray-200 font-semibold">Preview</div>
    <div className="flex-1 border-2 border-black bg-white"></div>  {/* Empty! */}
</div>
```

#### ✅ New Code:
```tsx
<div className="w-[200px] flex flex-col">
    <div className="text-center mb-1 text-gray-200 font-semibold">Preview</div>
    <div className="flex-1 border-2 border-black bg-white p-1">
        {selectedPartGeometry && selectedPartGeometry.length > 0 ? (
            <VectorPreview 
                geometry={cadEntitiesToGeometry(selectedPartGeometry)}
                width={198}
                height={198}
                className="w-full h-full"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                No Geometry
            </div>
        )}
    </div>
</div>
```

---

### **6. VectorPreview.tsx - Enhanced Conversion**

Added support for multiple CAD entity formats:
- ✅ Line: `{start, end}` or `{points: []}`
- ✅ Circle: `{center, radius}` or `{points, properties.radius}`
- ✅ Rectangle: `{points}` or `{corner1, corner2}`
- ✅ Polyline/Spline: `{points}`

```tsx
export function cadEntitiesToGeometry(entities: any[]): { paths: GeometryPath[] } {
  const paths: GeometryPath[] = [];

  console.log('🔄 Converting CAD entities:', entities.length);

  entities.forEach((entity, index) => {
    console.log(`  Entity ${index}:`, entity.type, entity);

    if (entity.type === 'line') {
      // Support both {start, end} and points[] formats
      const p1 = entity.start || entity.points?.[0];
      const p2 = entity.end || entity.points?.[1];
      
      if (p1 && p2) {
        paths.push({
          type: 'line',
          points: [p1, p2],
          isRapid: false
        });
      }
    } else if (entity.type === 'circle') {
      // ... circle conversion with fallbacks
    } else if (entity.type === 'rect' || entity.type === 'rectangle') {
      // ... rectangle with multiple format support
    }
    // ... more types
  });

  console.log('✅ Converted to paths:', paths.length);
  return { paths };
}
```

---

## 🎉 Kết quả

### ✅ Flow đã fix:
1. User vẽ shapes → Select objects
2. Click "Add Part From Drawing"
3. **Part Parameters Dialog mở** (có preview vector!)
4. User nhập thông tin → Click OK
5. **Dialog đóng** (không tự mở New Nest List)
6. User có thể:
   - Continue vẽ và add thêm parts
   - Manual mở New Nest List từ sidebar
   - Right-click nest list để configure

### ✅ Preview đã fix:
- ✅ **Real-time vector rendering** (green geometry)
- ✅ **Auto-scale** fit to 198×198px canvas
- ✅ **Support multiple entity formats**
- ✅ **Fallback "No Geometry"** khi chưa select
- ✅ **Debug logging** trong console

---

## 🧪 Testing Steps

### Test 1: Preview Rendering
1. Mở **Nesting AX**
2. Vẽ các shapes: Line, Circle, Rectangle
3. Click **"Add Part From Drawing"**
4. Window select các objects
5. ➡️ **Part dialog mở** → Check preview bên phải
6. Open browser console → Xem logs:
   ```
   🔍 Selected entities for preview: [...]
   📊 Entity structure sample: {...}
   🔄 Converting CAD entities: 3
     Entity 0: line {...}
     Entity 1: circle {...}
     Entity 2: rect {...}
   ✅ Converted to paths: 3
   ```

### Test 2: Flow Control
1. Nhập part name, quantity
2. Click **OK**
3. ➡️ Dialog đóng, **KHÔNG mở New Nest List**
4. Click vào nest list trong sidebar
5. ➡️ New Nest List modal mở, part đã được thêm vào list

### Test 3: Multiple Parts
1. Vẽ shape 1 → Select → Add part 1 → OK (dialog đóng)
2. Vẽ shape 2 → Select → Add part 2 → OK (dialog đóng)
3. Mở New Nest List modal
4. ➡️ Cả 2 parts đều có trong list

---

## 📝 Optional Enhancements

### Auto-reopen New Nest List after Add Part
Uncomment dòng này trong `handleClosePartParams()`:
```tsx
setTimeout(() => setShowModal(true), 300);
```

### Custom Delay
```tsx
// Reopen after 500ms
setTimeout(() => setShowModal(true), 500);
```

---

## 🐛 Troubleshooting

### Preview vẫn trống?
1. Mở browser console (F12)
2. Check logs:
   - `🔍 Selected entities for preview:` → Có entities không?
   - `📊 Entity structure sample:` → Cấu trúc đúng không?
   - `🔄 Converting CAD entities:` → Conversion thành công không?
3. Nếu có warning `⚠️ Unknown entity type:` → Thêm hỗ trợ entity type đó

### New Nest List vẫn mở tự động?
- Check line 220 trong `NestingAXApp.tsx`
- Đảm bảo `setShowModal(true)` đã bị comment/xóa

---

## ✨ Summary

| Issue | Status | Solution |
|-------|--------|----------|
| New Nest List modal auto-open | ✅ Fixed | Removed `setShowModal(true)` from `handleAddPart` |
| Preview không render | ✅ Fixed | Added VectorPreview integration + geometry state |
| Entity format support | ✅ Enhanced | Support multiple CAD entity formats |
| Debug visibility | ✅ Added | Console logging for geometry conversion |

**Total Files Changed:** 3
- `NestingAXApp.tsx` (flow control)
- `NestingAX/Workspace.tsx` (preview integration)
- `nesting/NewNestList/VectorPreview.tsx` (enhanced conversion)

**No Compile Errors** ✅
