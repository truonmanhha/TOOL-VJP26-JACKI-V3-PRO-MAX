# PLAN: Preview 2 Real-Time Selection Display

**Objective**: Hiển thị real-time những entity đang được SELECT trên canvas trong Preview 2 (Sidebar), không dùng data từ Part list.

**User Requirement**: "tôi muốn nó lấy thông tin tọa độ trực tiếp để lấy hình, sau đó scale cho hình nó nhỏ lại vừa với khung preview 2"

**Decision**: 
- Preview 2 sẽ hiển thị geometry của `selectedEntities` trên canvas (real-time)
- Khi không có selection → ẨN Preview 2 hoàn toàn
- Dùng `cadEntitiesToGeometry` (đã có sẵn) để convert entities sang format cho VectorPreview

---

## Architecture

### Current State
```
Workspace.tsx (line 395, 215)
  ├── selectedEntities: Set<string>     ← IDs của entities đang select
  └── cadEntities: CadEntity[]          ← Tất cả entities trên canvas

NestingAXApp.tsx
  └── KHÔNG CÓ state để lưu selection

Sidebar.tsx (line 119 - PREVIEW 2)
  └── Hiển thị parts[] từ database (Part list)
```

### Target State
```
Workspace.tsx
  ├── selectedEntities: Set<string>
  ├── cadEntities: CadEntity[]
  └── onSelectionChange(ids: Set<string>)  ← NEW callback to parent

NestingAXApp.tsx
  ├── selectedEntityIds: Set<string>     ← NEW state
  ├── allCadEntities: CadEntity[]        ← NEW state (snapshot from Workspace)
  └── Compute: selectedGeometry = allCadEntities.filter(e => selectedEntityIds.has(e.id))

Sidebar.tsx
  ├── selectedGeometry: CadEntity[]      ← NEW prop
  └── PREVIEW 2: Render selectedGeometry nếu có, ẩn nếu không
```

---

## Implementation Tasks

### TODO 1: Add State in NestingAXApp.tsx

**Location**: After line 35 (`currentSheets`)

**Code**:
```typescript
// Real-Time Selection Preview State (for PREVIEW 2)
const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
const [allCadEntities, setAllCadEntities] = useState<CadEntity[]>([]);

// Compute selected geometry for Preview 2
const selectedGeometry = React.useMemo(() => {
  if (selectedEntityIds.size === 0) return [];
  return allCadEntities.filter(entity => selectedEntityIds.has(entity.id));
}, [selectedEntityIds, allCadEntities]);
```

**Rationale**: 
- `selectedEntityIds` nhận IDs từ Workspace qua callback
- `allCadEntities` nhận snapshot entities để compute filtered geometry
- `useMemo` để optimize khi selection thay đổi

**QA Scenarios**:
- ✅ Chọn 1 entity → `selectedGeometry` có 1 item
- ✅ Chọn nhiều entities → `selectedGeometry` có nhiều items
- ✅ Clear selection → `selectedGeometry` là `[]`

---

### TODO 2: Add Callbacks in Workspace.tsx

**Location**: After line 191 (`capturedEntitiesRef`)

**Code**:
```typescript
// Broadcast selection changes to parent
useEffect(() => {
  // Notify parent about selection change
  onSelectionChange?.(selectedEntities, cadEntities);
}, [selectedEntities, cadEntities, onSelectionChange]);
```

**Props Interface Update** (line 13-83):
```typescript
interface WorkspaceProps {
  // ... existing props ...
  
  // Real-Time Selection Preview (for Preview 2)
  onSelectionChange?: (selectedIds: Set<string>, allEntities: CadEntity[]) => void;
}
```

**Rationale**:
- Mỗi khi `selectedEntities` hoặc `cadEntities` thay đổi → gọi callback
- Parent (NestingAXApp) nhận data và update state

**QA Scenarios**:
- ✅ Click entity → callback fired với updated Set
- ✅ Draw new entity → callback fired với updated cadEntities
- ✅ Delete entity → callback fired
- ✅ ESC clear selection → callback fired với empty Set

---

### TODO 3: Wire Callback in NestingAXApp.tsx

**Location**: After line 99 (`handleToggleSnapMode`)

**Code**:
```typescript
// Handle selection change from Workspace (for Preview 2)
const handleSelectionChange = useCallback((selectedIds: Set<string>, allEntities: CadEntity[]) => {
  setSelectedEntityIds(selectedIds);
  setAllCadEntities(allEntities);
}, []);
```

**Pass to Workspace** (in JSX around line 500+):
```typescript
<Workspace
  {/* ... existing props ... */}
  onSelectionChange={handleSelectionChange}
  {/* ... rest props ... */}
/>
```

**Rationale**:
- Single callback để nhận cả IDs và entities
- Update state khi Workspace báo thay đổi

**QA Scenarios**:
- ✅ Workspace trigger callback → state updated trong NestingAXApp
- ✅ selectedGeometry recomputed via useMemo

---

### TODO 4: Pass Props to Sidebar

**Location**: NestingAXApp.tsx JSX (around line 400-500, where Sidebar is rendered)

**Code**:
```typescript
<Sidebar
  {/* ... existing props ... */}
  selectedGeometry={selectedGeometry}
  {/* ... rest props ... */}
/>
```

**Update Sidebar Props Interface** (Sidebar.tsx line ~10-20):
```typescript
interface SidebarProps {
  // ... existing props ...
  selectedGeometry?: CadEntity[];  // NEW: Real-time selection preview
}
```

**Destructure in component** (Sidebar.tsx line ~40):
```typescript
const Sidebar: React.FC<SidebarProps> = ({
  // ... existing props ...
  selectedGeometry = [],
}) => {
```

**Rationale**:
- Optional prop (`?`) để không break existing usage
- Default `[]` để tránh null checks

**QA Scenarios**:
- ✅ Prop passed correctly → TypeScript không báo lỗi
- ✅ Default value works khi prop không truyền

---

### TODO 5: Update PREVIEW 2 Section in Sidebar.tsx

**Location**: Replace lines 116-149 (current PREVIEW 2 logic)

**Current Code** (TO REPLACE):
```typescript
{parts.length === 0 ? (
  <div className="text-gray-500 text-[11px] text-center py-2">Chưa có Part nào</div>
) : (
  <div className="space-y-2">
    {parts.map(part => {
      const geometryData = part.cadEntities 
        ? cadEntitiesToGeometry(part.cadEntities)
        : part.geometry 
        ? part.geometry.map(p => ({ x: p.x, y: p.y }))
        : null;

      return (
        <div key={part.id} className="flex items-center bg-slate-900/60 p-1.5 rounded-md border border-slate-700/50 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group">
          {/* PREVIEW 2 box */}
          <div className="flex flex-col items-center mr-3 shrink-0">
            <div className="text-[7px] font-bold text-cyan-500 mb-0.5 tracking-tighter">PREVIEW 2</div>
            <div className="w-20 h-20 bg-black border-2 border-slate-500 rounded-sm flex items-center justify-center shadow-inner group-hover:border-cyan-500/50 transition-colors overflow-hidden relative">
              {(part as any).thumbnail && (part as any).thumbnail !== '' ? (
                <img 
                  src={(part as any).thumbnail} 
                  className="w-full h-full object-contain" 
                  alt="preview"
                />
              ) : geometryData ? (
                <VectorPreview 
                  geometry={geometryData}
                  width={80}
                  height={80}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-[7px] text-red-500 font-bold text-center leading-none">NO<br/>GEO</div>
              )}
            </div>
          </div>
          {/* Part info */}
          <div>...</div>
        </div>
      );
    })}
  </div>
)}
```

**NEW Code** (COMPLETE REPLACEMENT):
```typescript
{/* PREVIEW 2: Real-Time Selection Display */}
{selectedGeometry && selectedGeometry.length > 0 ? (
  <div className="mb-3">
    <div className="flex items-center bg-gradient-to-r from-cyan-900/30 to-blue-900/30 p-1.5 rounded-md border border-cyan-500/40 shadow-lg">
      {/* Preview Box */}
      <div className="flex flex-col items-center mr-3 shrink-0">
        <div className="text-[7px] font-bold text-cyan-400 mb-0.5 tracking-tighter animate-pulse">PREVIEW 2 • LIVE</div>
        <div className="w-20 h-20 bg-black border-2 border-cyan-500/60 rounded-sm flex items-center justify-center shadow-inner overflow-hidden relative">
          <VectorPreview 
            geometry={cadEntitiesToGeometry(selectedGeometry)}
            width={80}
            height={80}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Selection Info */}
      <div className="overflow-hidden flex-1">
        <div className="font-bold text-[11px] text-cyan-300 truncate">
          Selection trên Canvas
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5">
          {selectedGeometry.length} entity đang chọn
        </div>
      </div>
    </div>
  </div>
) : null}

{/* Part List (original content below Preview 2) */}
{parts.length === 0 ? (
  <div className="text-gray-500 text-[11px] text-center py-2">Chưa có Part nào</div>
) : (
  <div className="space-y-2">
    {parts.map(part => {
      const geometryData = part.cadEntities 
        ? cadEntitiesToGeometry(part.cadEntities)
        : part.geometry 
        ? part.geometry.map(p => ({ x: p.x, y: p.y }))
        : null;

      return (
        <div key={part.id} className="flex items-center bg-slate-900/60 p-1.5 rounded-md border border-slate-700/50 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all group">
          {/* Part thumbnail (NO LONGER "PREVIEW 2" — this is just part list item) */}
          <div className="flex flex-col items-center mr-3 shrink-0">
            <div className="text-[7px] font-bold text-slate-500 mb-0.5 tracking-tighter">THUMB</div>
            <div className="w-16 h-16 bg-black border border-slate-600 rounded-sm flex items-center justify-center shadow-inner overflow-hidden relative">
              {(part as any).thumbnail && (part as any).thumbnail !== '' ? (
                <img 
                  src={(part as any).thumbnail} 
                  className="w-full h-full object-contain" 
                  alt="preview"
                />
              ) : geometryData ? (
                <VectorPreview 
                  geometry={geometryData}
                  width={64}
                  height={64}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-[7px] text-red-500 font-bold text-center leading-none">NO<br/>GEO</div>
              )}
            </div>
          </div>

          {/* Part info */}
          <div className="overflow-hidden flex-1">
            <div className="font-bold text-[11px] text-blue-300 truncate group-hover:text-cyan-300 transition-colors" title={part.name}>
              {part.name}
            </div>
            <div className="flex justify-between items-center mt-0.5 pr-1">
              <div className="text-[10px] text-gray-400">Qty: <span className="text-gray-200">{part.required}</span></div>
              <div className="text-[9px] text-gray-500 font-mono italic">{part.dimensions}</div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
```

**Changes**:
1. **NEW block at top**: Preview 2 hiển thị `selectedGeometry` (real-time)
   - Conditional render: chỉ hiện khi `selectedGeometry.length > 0`
   - Border cyan + "LIVE" badge để phân biệt với Part list
   - Display `{selectedGeometry.length} entity đang chọn`
2. **Part list items**: 
   - Label đổi từ "PREVIEW 2" → "THUMB" (để không nhầm)
   - Giảm kích thước từ 80px → 64px (thumbnail nhỏ hơn)
   - Vẫn giữ nguyên logic render từ `cadEntities`/`geometry`/`thumbnail`

**Rationale**:
- Preview 2 giờ là **dedicated real-time preview** ở TOP
- Part list thumbnails là **static thumbnails** ở BOTTOM
- Rõ ràng về mục đích: Preview 2 = live selection, Thumbnails = saved parts

**QA Scenarios**:
- ✅ Chọn 1 circle → Preview 2 hiện circle
- ✅ Chọn bình hoa phức tạp → Preview 2 hiện đúng curves
- ✅ Clear selection (ESC) → Preview 2 biến mất
- ✅ Chọn entity ở tọa độ xa (X=5000) → Preview 2 vẫn căn giữa đúng (nhờ VectorPreview offset fix)
- ✅ Part list thumbnails vẫn hoạt động bình thường (không bị ảnh hưởng)

---

### TODO 6: Import cadEntitiesToGeometry in Sidebar.tsx

**Location**: Top of Sidebar.tsx (imports section)

**Current Import** (check if exists):
```typescript
import VectorPreview from '../nesting/NewNestList/VectorPreview';
```

**NEW Import** (if not exist):
```typescript
import VectorPreview, { cadEntitiesToGeometry } from '../nesting/NewNestList/VectorPreview';
```

**Rationale**: Need `cadEntitiesToGeometry` helper để convert `CadEntity[]` → geometry format cho VectorPreview

**QA Scenarios**:
- ✅ Import resolves (function exists in VectorPreview.tsx)
- ✅ TypeScript không báo lỗi

---

## File Change Summary

| File | Lines Changed | Type | Description |
|------|---------------|------|-------------|
| `NestingAXApp.tsx` | +10 | State | selectedEntityIds, allCadEntities, selectedGeometry (useMemo) |
| `NestingAXApp.tsx` | +5 | Handler | handleSelectionChange callback |
| `NestingAXApp.tsx` | +1 | Props | Pass onSelectionChange to Workspace |
| `NestingAXApp.tsx` | +1 | Props | Pass selectedGeometry to Sidebar |
| `Workspace.tsx` | +1 | Interface | Add onSelectionChange prop |
| `Workspace.tsx` | +6 | Effect | useEffect broadcast selection changes |
| `Sidebar.tsx` | +1 | Interface | Add selectedGeometry prop |
| `Sidebar.tsx` | +1 | Import | Import cadEntitiesToGeometry |
| `Sidebar.tsx` | +40 -34 | JSX | Replace PREVIEW 2 logic với real-time preview |

**Total**: ~66 lines changed across 3 files

---

## Verification Steps

### TypeScript Compilation
```bash
npx tsc --noEmit
```
Expected: No errors

### Manual Testing
1. `npm run dev` → mở browser
2. Vẽ 1 circle → click chọn → **Preview 2 hiện circle real-time**
3. Vẽ bình hoa phức tạp → quét chọn → **Preview 2 hiện đúng curves**
4. ESC clear selection → **Preview 2 biến mất**
5. Chọn nhiều entities → **Preview 2 hiện "X entity đang chọn"**
6. Vẽ entity ở X=5000 → chọn → **Preview 2 vẫn căn giữa**
7. Thêm Part vào list → **Part list thumbnails vẫn hoạt động bình thường**

---

## Edge Cases Handled

| Case | Behavior | Rationale |
|------|----------|-----------|
| No selection | Preview 2 ẩn hoàn toàn | User yêu cầu "ẩn" |
| 1 entity selected | Preview 2 hiện "1 entity đang chọn" | Single item display |
| 100+ entities selected | Preview 2 hiện "100 entity đang chọn" | Performance: VectorPreview vẫn render nhanh |
| Selection ở tọa độ âm | VectorPreview tự động offset | Already fixed in previous commit |
| Delete entity đang select | Callback trigger → state update → Preview 2 update | Reactive flow |
| Clear selection (ESC) | `selectedEntityIds` becomes empty → Preview 2 hidden | Conditional render |

---

## Dependencies

- ✅ `cadEntitiesToGeometry` function (already exists in VectorPreview.tsx)
- ✅ `VectorPreview` component (already exists)
- ✅ `CadEntity` type (imported from services/db.ts)
- ✅ VectorPreview offset fix (already committed in `fe68c1b`)

---

## Final Verification Wave

**Acceptance Criteria (ALL must pass):**
- [ ] TypeScript compilation: `npx tsc --noEmit` → zero errors
- [ ] Preview 2 hiện real-time khi có selection
- [ ] Preview 2 ẩn khi không có selection
- [ ] Preview 2 hiển thị đúng shape phức tạp (bình hoa, curves)
- [ ] Preview 2 scale tự động vừa khung 80x80px
- [ ] Part list thumbnails vẫn hoạt động độc lập
- [ ] Không có regression trên tính năng khác

---

## Notes

**Performance**: 
- `useMemo` để tránh re-filter mỗi render
- `useCallback` để stabilize handler reference
- VectorPreview đã được optimize trong previous sessions

**UI/UX**:
- Preview 2 có border cyan + "LIVE" badge để phân biệt rõ với Part list
- Part list thumbnails nhỏ hơn (64px) và label "THUMB" thay vì "PREVIEW 2"
- AnimatePresence có thể thêm sau nếu muốn fade in/out effect

**Migration Path**:
- Backward compatible: Sidebar vẫn hoạt động nếu không truyền `selectedGeometry` prop
- Zero breaking changes cho existing features
