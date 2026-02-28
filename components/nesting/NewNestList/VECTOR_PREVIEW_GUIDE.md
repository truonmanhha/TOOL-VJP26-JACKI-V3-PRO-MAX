# 🎨 VECTOR PREVIEW COMPONENT - HƯỚNG DẪN SỬ DỤNG

## 📋 Tổng Quan

Component **VectorPreview** là một trình kết xuất vector thời gian thực (real-time vector renderer) được thiết kế để hiển thị hình học CAD và toolpaths trong khung preview của Nesting AX.

**Không phải là ảnh chụp màn hình (bitmap)** - Đây là vector rendering engine!

---

## 🔧 Nguyên Lý Hoạt Động

### **Bước 1: Lấy Dữ Liệu (Data Acquisition)**
```typescript
// Đọc toàn bộ dữ liệu hình học từ các đối tượng được chọn
const geometry = {
  paths: [
    {
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      isRapid: false  // Feed move (xanh)
    },
    {
      type: 'polyline',
      points: [{ x: 100, y: 100 }, { x: 200, y: 50 }, ...],
      isRapid: true   // Rapid move (đỏ)
    }
  ]
};
```

### **Bước 2: Tính Bounding Box (Khung Bao)**
```typescript
// Tìm tọa độ min/max của tất cả các điểm
let minX = Infinity, minY = Infinity;
let maxX = -Infinity, maxY = -Infinity;

geometry.paths.forEach(path => {
  path.points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
});

const geomWidth = maxX - minX;
const geomHeight = maxY - minY;
```

### **Bước 3: Auto-scaling (Tự Động Thu Nhỏ)**
```typescript
// Tính tỷ lệ để fit vừa khung preview
const padding = 20;
const availableWidth = canvasWidth - padding * 2;
const availableHeight = canvasHeight - padding * 2;

const scaleX = availableWidth / geomWidth;
const scaleY = availableHeight / geomHeight;
const scale = Math.min(scaleX, scaleY); // Chọn tỷ lệ nhỏ hơn

// Tính offset để căn giữa
const offsetX = (canvasWidth - geomWidth * scale) / 2 - minX * scale;
const offsetY = (canvasHeight - geomHeight * scale) / 2 - minY * scale;

// Transform mỗi điểm
const screenX = worldX * scale + offsetX;
const screenY = worldY * scale + offsetY;
```

---

## 🎨 Màu Sắc Hiển Thị

| Màu | Ý Nghĩa | Loại Đường |
|-----|---------|------------|
| 🟢 **Xanh lá (#22c55e)** | Geometry / Feed moves (G1) | Đường cắt chính |
| 🔴 **Đỏ (#ef4444)** | Rapid moves (G0) | Đường di chuyển nhanh |

---

## 📝 Cách Sử Dụng

### **1. Import Component**
```tsx
import VectorPreview, { 
  cadEntitiesToGeometry, 
  generateThumbnail 
} from './VectorPreview';
```

### **2. Sử dụng trong JSX**
```tsx
<VectorPreview 
  geometry={geometryData}
  width={200}
  height={200}
  className="rounded-lg"
/>
```

### **3. Convert CAD Entities sang Geometry Format**
```tsx
// Từ CAD entities (line, circle, rect, polyline)
const cadEntities = [
  { type: 'line', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
  { type: 'rect', points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
  { type: 'circle', center: { x: 25, y: 25 }, radius: 10 }
];

const geometry = cadEntitiesToGeometry(cadEntities);

// Kết quả:
// {
//   paths: [
//     { type: 'line', points: [...], isRapid: false },
//     { type: 'polyline', points: [...], isRapid: false },
//     { type: 'polyline', points: [...], isRapid: false } // Circle as polyline
//   ]
// }
```

### **4. Generate Thumbnail (Base64)**
```tsx
const thumbnail = generateThumbnail(geometry, 200, 200);
// Returns: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."

// Lưu vào database hoặc sử dụng trong <img>
<img src={thumbnail} alt="Part preview" />
```

---

## 🔄 Tích Hợp với PartParametersDialog

### **Trước (Old - Bitmap Thumbnail)**
```tsx
<img src={thumbnail} alt="Part preview" />
```

### **Sau (New - Vector Rendering)**
```tsx
const geometryForPreview = React.useMemo(() => {
  if (!selectedGeometry) return undefined;
  if (Array.isArray(selectedGeometry)) {
    return cadEntitiesToGeometry(selectedGeometry);
  }
  return selectedGeometry.paths ? selectedGeometry : undefined;
}, [selectedGeometry]);

<VectorPreview 
  geometry={geometryForPreview} 
  width={120} 
  height={120}
/>
```

---

## 🛠️ Helper Functions

### **1. cadEntitiesToGeometry()**
Convert CAD entities (line, circle, rect, polyline, spline) sang geometry format.

**Hỗ trợ:**
- ✅ Line
- ✅ Circle (convert sang polyline với 32 segments)
- ✅ Rectangle (convert sang closed polyline)
- ✅ Polyline
- ✅ Spline

### **2. dxfEntitiesToGeometry()**
Convert DXF entities sang geometry format.

### **3. gcodeToGeometry()**
Convert G-code toolpath sang geometry format, tự động phân biệt G0 (rapid) và G1 (feed).

### **4. generateThumbnail()**
Render geometry ra canvas offscreen và export sang base64 PNG.

---

## 📊 Performance

| Feature | Implementation |
|---------|----------------|
| **Rendering** | Canvas 2D API (hardware-accelerated) |
| **Re-render** | Only when `geometry` changes (React.useMemo) |
| **Memory** | Minimal - no image storage, pure vector |
| **Scalability** | Automatic - works with any size geometry |

---

## 🎯 Use Cases

### **1. Part Preview trong Dialog**
```tsx
<PartParametersDialog
  selectedGeometry={cadEntities}
  geometrySize={{ width: 100, height: 200 }}
/>
```

### **2. Part List Thumbnails**
```tsx
{parts.map(part => (
  <VectorPreview 
    geometry={part.geometry}
    width={80}
    height={80}
  />
))}
```

### **3. Nesting Results Preview**
```tsx
<VectorPreview 
  geometry={nestedLayout}
  width={300}
  height={300}
/>
```

---

## 🐛 Troubleshooting

### **Problem: "No Preview" displayed**
**Cause:** `geometry` is `undefined` or `paths` array is empty.

**Solution:**
```tsx
// Check if geometry exists
if (!geometry || !geometry.paths || geometry.paths.length === 0) {
  console.log('No geometry data provided');
}
```

### **Problem: "Invalid Data" displayed**
**Cause:** Points have invalid coordinates (NaN, Infinity).

**Solution:**
```tsx
// Validate points before passing
const validPoints = points.filter(p => 
  isFinite(p.x) && isFinite(p.y)
);
```

### **Problem: "Too Small" displayed**
**Cause:** Bounding box width or height is 0 (all points are on same line).

**Solution:**
```tsx
// Add padding or check geometry
if (geomWidth === 0 || geomHeight === 0) {
  // Handle degenerate case
}
```

---

## 📦 Exported Items

```typescript
// Main component
export default VectorPreview;

// Helper functions
export { 
  cadEntitiesToGeometry,
  dxfEntitiesToGeometry,
  gcodeToGeometry,
  generateThumbnail
};

// Types
export type { GeometryPoint, GeometryPath };
```

---

## 🎓 Technical Notes

### **Coordinate System**
- Input: World coordinates (mm, CAD units)
- Output: Screen coordinates (pixels)
- Transform: `screen = world * scale + offset`

### **Rendering Order**
1. Clear canvas (dark gray background)
2. Calculate bounding box
3. Calculate scale & offset
4. Render paths (green for feed, red for rapid)
5. Optional: Draw bounding box for debug

### **Canvas Optimization**
- Use `lineCap: 'round'` for smooth corners
- Use `lineJoin: 'round'` for smooth connections
- Set `imageRendering: 'crisp-edges'` for sharp vectors

---

## ✅ Testing

### **Test 1: Simple Line**
```tsx
const testGeometry = {
  paths: [
    { type: 'line', points: [{ x: 0, y: 0 }, { x: 100, y: 100 }], isRapid: false }
  ]
};
```

### **Test 2: Multiple Paths**
```tsx
const testGeometry = {
  paths: [
    { type: 'polyline', points: [...], isRapid: false },
    { type: 'polyline', points: [...], isRapid: true }
  ]
};
```

### **Test 3: Complex Shape**
```tsx
const cadEntities = [/* complex CAD data */];
const geometry = cadEntitiesToGeometry(cadEntities);
```

---

## 📚 References

- Canvas 2D API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Bounding Box Algorithm: https://en.wikipedia.org/wiki/Minimum_bounding_box
- G-code Reference: https://www.reprap.org/wiki/G-code

---

**Created:** 2026-02-13  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
