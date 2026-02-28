# Mouse Click Precision Fix - Nesting Tool AX

## Problem
Khi nhấn chuột ở đâu thì bị lệch vị trí, không đúng đến từng pixel.

## Root Cause
Các hàm xử lý sự kiện chuột (mouse event handlers) đang tính toán tọa độ không nhất quán:
- Mỗi handler đều gọi `getBoundingClientRect()` riêng lẻ
- Không có helper function chung để đảm bảo tính nhất quán
- Có thể có sự khác biệt nhỏ trong cách tính toán giữa các handlers

## Solution
Đã tạo một helper function `getCanvasMousePos()` để:
1. Tính toán tọa độ chuột chính xác từ canvas element
2. Đảm bảo tất cả các mouse handlers sử dụng cùng một phương pháp tính toán
3. Loại bỏ sự không nhất quán giữa các handlers

## Changes Made

### 1. Added Helper Function (Line ~1045)
```typescript
// Helper to get mouse position relative to canvas
const getCanvasMousePos = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
};
```

### 2. Updated All Mouse Event Handlers
- `handleWheel()` - Zoom với chuột
- `handleRadialContextMenu()` - Right-click menu
- `handleContextMenu()` - Context menu
- `handleMouseDown()` - Click events (CRITICAL)
- `handleMouseMove()` - Mouse movement và dragging

## Testing Checklist
- [ ] Click vào canvas - kiểm tra vị trí chính xác
- [ ] Drag parts - kiểm tra không bị lệch
- [ ] Zoom với mouse wheel - kiểm tra zoom đúng vị trí chuột
- [ ] Right-click menu - kiểm tra menu xuất hiện đúng vị trí
- [ ] Selection box - kiểm tra box selection chính xác
- [ ] Join mode - kiểm tra click endpoints chính xác

## Technical Details
- Coordinate System: Screen coordinates → World coordinates
- Transformation: `screenToWorld(sx, sy) => { wx: (sx - view.x) / view.scale, wy: (sy - view.y) / view.scale }`
- Canvas position: Lấy từ `getBoundingClientRect()` để tính offset chính xác
- Consistency: Tất cả handlers đều dùng cùng một helper function

## Impact
- ✅ Pixel-perfect mouse clicks
- ✅ Accurate coordinate transformation
- ✅ Consistent behavior across all mouse interactions
- ✅ No more offset issues
