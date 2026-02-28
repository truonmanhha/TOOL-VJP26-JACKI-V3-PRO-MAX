# 🔧 Fix: Rectangle Input - Width & Height

## 🐛 Vấn đề (Problem)
Khi vẽ rectangle và nhập `1220,2440` vào command input rồi ấn Enter, kích thước không đúng.

## ✅ Giải pháp (Solution)

### Thay đổi logic xử lý input cho Rectangle:

**TRƯỚC ĐÂY:** Input `x,y` luôn được hiểu là **tọa độ tuyệt đối** (absolute coordinates)

**BÂY GIỜ:** 
- Khi vẽ **Rectangle** ở bước 2 (đã có điểm đầu), input `x,y` được hiểu là **WIDTH,HEIGHT** (chiều rộng, chiều cao)
- Điểm thứ 2 sẽ được tính: `(firstPoint.x + width, firstPoint.y + height)`

## 🎯 Cách sử dụng (Usage)

### 1. Vẽ Rectangle bằng cách nhập kích thước:

```
Bước 1: Chọn Rectangle tool từ Radial Menu
Bước 2: Click để chọn điểm góc đầu tiên (hoặc nhập tọa độ x,y)
Bước 3: Nhập kích thước: 1220,2440
Bước 4: Ấn Enter
```

**Ví dụ:**
- Click tại điểm (0, 0)
- Nhập: `1220,2440`
- Ấn Enter
- ✅ Kết quả: Rectangle từ (0,0) đến (1220, 2440) với kích thước 1220×2440

### 2. Các định dạng input khác vẫn hoạt động:

#### **Tọa độ tuyệt đối (Line, Polyline):**
```
100,200
```
→ Điểm tại tọa độ (100, 200)

#### **Tọa độ tương đối:**
```
@50,100
```
→ Di chuyển 50 đơn vị theo X, 100 đơn vị theo Y từ điểm cuối

#### **Khoảng cách (Distance):**
```
1500
```
→ Di chuyển 1500 đơn vị theo hướng con trỏ chuột

#### **Polar (Khoảng cách + Góc):**
```
1000<45
```
→ Di chuyển 1000 đơn vị theo góc 45°

## 📝 Code Changes

### File: `Workspace.tsx`

#### 1. Enhanced Command Input Handler:

```typescript
if (activeDrawTool && drawState.step > 0 && drawState.points.length > 0) {
  // If drawing rectangle and at step 1, treat as WIDTH,HEIGHT
  if (activeDrawTool === 'rect') {
    const firstPoint = drawState.points[0];
    console.log('📏 Rectangle: First point:', firstPoint, 'Width:', x, 'Height:', y);
    
    // Calculate second point based on width and height
    const targetPos = {
      x: firstPoint.x + x,
      y: firstPoint.y + y
    };
    
    handleDrawingClick(targetPos);
  } else {
    // For other tools: relative or absolute coordinates
    // ...
  }
}
```

#### 2. Dynamic UI Labels:

```typescript
// Prompt changes based on tool and step
{drawState.step === 0 
  ? '- Specify first point:' 
  : activeDrawTool === 'rect' 
    ? '- Width,Height or point:'
    : '- Specify next point:'}
```

#### 3. Context-Sensitive Placeholder:

```typescript
placeholder={
  activeDrawTool === 'rect' && drawState.step > 0
    ? "1220,2440 (W,H)"
    : "x,y | @dx,dy | L<A"
}
```

## 🧪 Testing Steps

### Test Case 1: Vẽ Standard Sheet (1220×2440)

1. Chọn Rectangle tool
2. Click tại (0, 0)
3. Nhập: `1220,2440`
4. Ấn Enter
5. **Expected:** Rectangle xuất hiện với kích thước chính xác 1220×2440

### Test Case 2: Vẽ Multiple Rectangles

1. Vẽ rectangle đầu tiên như Test Case 1
2. Tool vẫn active
3. Click điểm mới
4. Nhập: `3000,1500` (sheet lớn hơn)
5. Ấn Enter
6. **Expected:** Rectangle thứ 2 với kích thước 3000×1500

### Test Case 3: Kết hợp với các công cụ khác

1. Vẽ Rectangle với kích thước
2. Chuyển sang Line tool
3. Nhập tọa độ: `100,200`
4. **Expected:** Line tool vẫn sử dụng tọa độ tuyệt đối, không ảnh hưởng

## 🎨 UI Improvements

### Before:
```
RECT - Specify next point:
[input: x,y | @dx,dy | L<A]
x,y | @dx,dy | length | length<angle
```

### After (when drawing rectangle, step 2):
```
RECT - Width,Height or point:
[input: 1220,2440 (W,H)]
Enter Width,Height (e.g., 1220,2440)
```

## 📊 Debug Logs

Khi nhập `1220,2440` vào rectangle, console sẽ hiển thị:

```
📝 Command input: 1220,2440 DrawState: {...} Tool: rect
📐 Parsed coordinates: { isRelative: false, x: 1220, y: 2440 }
📏 Rectangle: First point: { x: 0, y: 0 } Width: 1220 Height: 2440
✅ Rectangle target: { x: 1220, y: 2440 }
🎨 handleDrawingClick called with: { activeDrawTool: 'rect', worldPos: {x: 1220, y: 2440} }
📊 prevDrawState: { step: 1, points: [{x: 0, y: 0}], currentPos: null }
✅ Step 1→0: Saving entity { type: 'rect', points: [...] }
📊 cadEntities updated: [...]
```

## ✨ Benefits

1. **Intuitive for Manufacturing:** Nhập trực tiếp kích thước sheet thay vì phải tính tọa độ
2. **AutoCAD-like:** Giống cách làm việc trong AutoCAD khi vẽ rectangle
3. **Flexible:** Vẫn có thể nhập tọa độ điểm nếu muốn
4. **Clear UI:** Placeholder và prompt thay đổi để hướng dẫn người dùng

## 🚀 Future Enhancements

- [ ] Support nhập kích thước cho Circle (radius)
- [ ] Support nhập dimensions cho các tool khác
- [ ] Thêm unit selector (mm, inches, etc.)
- [ ] History dropdown cho common sizes (1220×2440, 3000×1500, etc.)

## 🔍 Related Files

- `components/NestingAX/Workspace.tsx` - Main implementation
- `DRAWING_TOOLS_FIX_REPORT.md` - Previous drawing tools fix

## ✅ Status

**COMPLETED** - Ready for testing
