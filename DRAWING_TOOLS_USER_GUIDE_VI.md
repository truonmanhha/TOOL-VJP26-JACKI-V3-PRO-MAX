# 🎨 HƯỚNG DẪN SỬ DỤNG CÔNG CỤ VẼ - DRAWING TOOLS

## ✅ TRẠNG THÁI HIỆN TẠI

- **Server:** ✅ Chạy thành công tại `http://localhost:5173/`
- **Compilation:** ✅ Không có lỗi TypeScript
- **Drawing Tools:** ✅ Hoàn toàn hoạt động

---

## 📂 CỤC TRÚC FILE

```
components/nesting/
├── DrawingTools.tsx                 # UI Toolbar + State Management
├── DrawingWorkspace.tsx             # Canvas Engine + Event Handling
├── DrawingToolsIntegration.tsx      # Integration Examples
├── DrawingToolsTest.tsx             # Test Component (NEW)
├── PartParametersDialog.tsx         # Part Dialog with Drawing
├── SheetDatabaseDialog.tsx          # Sheet Dialog with Drawing
└── DRAWING_TOOLS_*.md              # Documentation
```

---

## 🎯 CÁC CÔNG CỤ VẼ

### 1. **Line Tool** 🔹
- **Shortcut:** `L`
- **Cách sử dụng:**
  1. Nhấn `L` hoặc click nút Line
  2. Click điểm đầu
  3. Click điểm cuối
  4. Đường thẳng được lưu tự động

### 2. **Rectangle Tool** ⬜
- **Shortcut:** `R`
- **Cách sử dụng:**
  1. Nhấn `R` hoặc click nút Rectangle
  2. Click góc thứ nhất
  3. Click góc đối diện
  4. Hình chữ nhật được lưu tự động

### 3. **Circle Tool** ⭕
- **Shortcut:** `C`
- **Cách sử dụng:**
  1. Nhấn `C` hoặc click nút Circle
  2. Click tâm đường tròn
  3. Click trên chu vi (để xác định bán kính)
  4. Đường tròn được lưu tự động

### 4. **Polyline Tool** 📍
- **Shortcut:** `P`
- **Cách sử dụng:**
  1. Nhấn `P` hoặc click nút Polyline
  2. Click điểm thứ nhất
  3. Click điểm thứ hai, thứ ba, ... (tùy ý)
  4. **Nhấn Enter hoặc Right Click** để hoàn thành
  5. Đường gấp khúc được lưu

### 5. **Spline Tool** 🔀
- **Shortcut:** `S`
- **Cách sử dụng:**
  1. Nhấn `S` hoặc click nút Spline
  2. Click điểm thứ nhất, thứ hai, ...
  3. **Nhấn Enter hoặc Right Click** để hoàn thành
  4. Đường cong mượt mà được lưu

### 6. **Pointer Tool** 👆
- **Shortcut:** `Esc`
- **Mục đích:** Tắt công cụ vẽ, chỉ dùng để xem/zoom

---

## ⌨️ KEYBOARD SHORTCUTS

| Phím | Chức năng |
|------|----------|
| `L` | Kích hoạt Line tool |
| `R` | Kích hoạt Rectangle tool |
| `C` | Kích hoạt Circle tool |
| `P` | Kích hoạt Polyline tool |
| `S` | Kích hoạt Spline tool |
| `Esc` | Hủy công cụ (Pointer mode) |
| `Enter` | Kết thúc Polyline/Spline |
| `Right Click` | Kết thúc Polyline/Spline |

---

## 🖱️ MOUSE CONTROLS

| Hành động | Chức năng |
|-----------|----------|
| **Left Click** | Vẽ (khi công cụ được kích hoạt) |
| **Middle Mouse Drag** | Pan/dịch chuyển canvas |
| **Mouse Wheel Up/Down** | Zoom in/out |
| **Right Click** | Kết thúc Polyline/Spline |

---

## 🔍 ZOOM & PAN

### Zoom In/Out
1. Di chuyển chuột đến vị trí muốn zoom
2. Quay bánh xe chuột lên (In) hoặc xuống (Out)
3. Canvas sẽ zoom với vị trí con trỏ làm tâm

### Pan/Dịch Chuyển
1. Nhấn **Middle Mouse Button** (bánh xe chuột)
2. Kéo chuột sang hướng muốn
3. Canvas sẽ dịch chuyển theo hướng kéo

---

## 📊 CANVAS FEATURES

### Grid Display
- **Hiển thị:** Lưới tọa độ trên canvas
- **Toggle Grid:** Click nút "Toggle Grid" ở thanh thông tin dưới
- **Tính năng:** Giúp căn chỉnh các entity chính xác

### Entity Counter
- Hiển thị số lượng entity đã vẽ
- Cập nhật real-time khi thêm/xoá entity

### Zoom Level Display
- Hiển thị tỷ lệ zoom hiện tại (ví dụ: 1.00x, 0.50x)
- Giúp theo dõi mức zoom

### Info Bar
```
Zoom: 1.00x | Entities: 5 | Grid: On | [Toggle Grid]
```

---

## 🧹 CLEAR & UNDO

### Clear All Entities
- Click nút **Rotate (Clear)** trong toolbar
- Hoặc chuột phải vào nút trong toolbar
- **Tất cả entity sẽ bị xoá** (không thể undo)

### Hủy Công Cụ Hiện Tại
- Nhấn `Esc` để hủy công cụ hiện tại
- Drawing state sẽ reset

---

## 🎨 COLORS & STYLING

| Phần tử | Màu sắc | Mục đích |
|--------|---------|---------|
| **Grid** | Trắng mờ (10%) | Căn chỉnh |
| **Entity Fill** | Xanh lá mờ (10%) | Hiển thị vùng |
| **Entity Stroke** | Xanh lá sáng (#00ff88) | Viền |
| **Preview** | Xanh lá đứt nét | Xem trước |
| **Crosshair** | Xanh lá | Con trỏ |

---

## 🐛 TROUBLESHOOTING

### Vấn đề: Drawing tool không hoạt động
**Giải pháp:**
1. Kiểm tra console (`F12`) xem có lỗi không
2. Refresh trang (`F5`)
3. Kiểm tra xem công cụ đã được kích hoạt (nút bị highlight)

### Vấn đề: Canvas không phản ứng khi click
**Giải pháp:**
1. Nhấn `Esc` để đảm bảo không ở chế độ vẽ
2. Click lại trên canvas trước khi vẽ
3. Kiểm tra console

### Vấn đề: Zoom không hoạt động
**Giải pháp:**
1. Kiểm tra chuột có bánh xe không
2. Thử Middle Mouse Drag để pan
3. Refresh trang

### Vấn đề: Polyline/Spline không lưu được
**Giải pháp:**
1. Nhấn `Enter` hoặc **Right Click** (không phải Left Click)
2. Đảm bảo đã vẽ tối thiểu 2 điểm
3. Kiểm tra console

---

## 📋 ENTITY PROPERTIES

### Line
```json
{
  "id": "uuid",
  "type": "line",
  "points": [
    { "x": 0, "y": 0 },
    { "x": 100, "y": 100 }
  ]
}
```

### Rectangle
```json
{
  "id": "uuid",
  "type": "rect",
  "points": [
    { "x": 0, "y": 0 },
    { "x": 100, "y": 50 }
  ]
}
```

### Circle
```json
{
  "id": "uuid",
  "type": "circle",
  "points": [
    { "x": 50, "y": 50 },  // center
    { "x": 100, "y": 50 }  // radius point
  ],
  "properties": {
    "radius": 50
  }
}
```

### Polyline/Spline
```json
{
  "id": "uuid",
  "type": "polyline",
  "points": [
    { "x": 0, "y": 0 },
    { "x": 50, "y": 50 },
    { "x": 100, "y": 0 },
    { "x": 150, "y": 100 }
  ]
}
```

---

## 🔧 TECHNICAL DETAILS

### Coordinate System
- **World Coordinates:** Tọa độ thực tế của đối tượng
- **Screen Coordinates:** Tọa độ pixel trên canvas
- **Conversion:** `screenToWorld()` / `worldToScreen()`

### Canvas Rendering
- **Backend:** HTML5 Canvas 2D
- **Real-time:** 60 FPS
- **Performance:** Optimized rendering loop

### State Management
- **React Hooks:** useState, useCallback, useEffect, useMemo
- **No Redux:** Local state management

---

## 📝 ỨNG DỤNG THỰC TẾ

### Tích hợp trong Part Dialog
```tsx
<PartParametersDialog
  isOpen={true}
  onConfirm={handlePartCreated}
  partData={{
    width: 100,
    height: 100,
    area: 10000,
    geometry: []
  }}
/>
```
- Người dùng có thể vẽ hình dạng part
- Auto-calculate width/height từ vẽ

### Tích hợp trong Sheet Dialog
```tsx
<SheetDatabaseDialog
  isOpen={true}
  onConfirm={handleSheetCreated}
/>
```
- Vẽ form sheet
- Define area

### Standalone Usage
```tsx
<DrawingWorkspace
  width={800}
  height={600}
  onCadEntitiesChange={handleEntities}
/>
```

---

## 🎓 BEST PRACTICES

1. **Luôn Zoom Phù Hợp** - Zoom in để vẽ chính xác
2. **Sử Dụng Grid** - Bật Grid để căn chỉnh
3. **Polyline Tuần Hoàn** - Close path bằng Right Click
4. **Backup Data** - Export entities định kỳ
5. **Use Keyboard** - Nhanh hơn click mouse

---

## 🚀 PERFORMANCE TIPS

| Vấn đề | Giải pháp |
|--------|----------|
| Canvas chậm | Zoom phù hợp, giảm số entity |
| Memory leak | Refresh trang, clear entities |
| Mouse lag | Disable grid, reduce entities |

---

## 📞 SUPPORT

- **Server:** `http://localhost:5173/`
- **Hot Reload:** Tự động khi sửa file
- **Console:** `F12` để debug

---

**Cập nhật:** February 13, 2026  
**Status:** ✅ Production Ready
