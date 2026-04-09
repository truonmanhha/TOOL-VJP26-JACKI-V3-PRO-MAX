# 🚀 QUICK START - Add Part From Drawing

## Quy Trình Sử Dụng (5 Bước)

### 1️⃣ Mở Tool
```
Vào tab: NESTING AX
```

### 2️⃣ Vẽ hoặc có sẵn đối tượng
```
- Vẽ Line: nhấn L, click 2 điểm
- Vẽ Circle: nhấn C, click tâm, click bán kính
- Vẽ Rectangle: nhấn REC, click 2 góc
- Hoặc import DXF file
```

### 3️⃣ Mở New Nest List
```
Click nút tím-hồng: "NEW NEST LIST" trên toolbar
```

### 4️⃣ Thêm Part
```
Click: "Thêm Chi Tiết Từ Bản Vẽ" (Panel 1)
    ↓
Modal biến mất
    ↓
Click các object trên canvas (chọn 1 hoặc nhiều)
    ↓
Chuột phải để hoàn tất
```

### 5️⃣ Xem Kết Quả
```
Modal tự động mở lại
    ↓
Panel 2 hiển thị part vừa thêm với:
- Tên: Part 1, Part 2, ...
- Kích thước: W × H
- Số lượng: 1 (có thể edit)
- Icon tương ứng (📏 📐 ⭕ ▭)
```

---

## 🎯 Video Demo Flow

```
┌─────────────────────────────────────────┐
│  1. Click "NEW NEST LIST"               │
│     → Modal xuất hiện                   │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  2. Click "Thêm Chi Tiết Từ Bản Vẽ"     │
│     → Modal ẩn                          │
│     → Prompt: "Select parts..."         │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  3. Click Line trên canvas              │
│     → Line highlight màu xanh           │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  4. Chuột phải                          │
│     → Tính toán tự động                 │
│     → Add vào list                      │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  5. Modal mở lại                        │
│     → Panel 2 hiển thị:                 │
│       📏 Part 1                         │
│       Dài: 150.50                       │
│       Quantity: 1                       │
│       ✓ Selected                        │
└─────────────────────────────────────────┘
```

---

## ⚡ Shortcuts & Tips

### Keyboard Shortcuts
- `L` - Draw Line
- `C` - Draw Circle
- `REC` - Draw Rectangle
- `ESC` - Cancel selection
- `Right-Click` - Finish selection

### Pro Tips
1. **Chọn nhiều objects:** Click lần lượt từng object trước khi right-click
2. **Bounding Box:** Kích thước part = bounding box bao tất cả objects đã chọn
3. **Edit sau:** Có thể edit Quantity, Priority, Rotation trong Grid
4. **Delete:** Click 🗑️ để xóa part khỏi list

---

## 🐛 Troubleshooting

### "Panel 2 trống?"
✅ **ĐÃ FIX!** Right-click để hoàn tất selection

### "Không chọn được object?"
- Đảm bảo đã vào selection mode (click "Thêm Chi Tiết")
- Object phải visible (không bị ẩn layer)

### "Kích thước sai?"
- Kích thước = bounding box (hình chữ nhật bao quanh)
- Nếu chọn nhiều objects rời nhau → bounding box rất lớn

---

## 📊 Data Structure

Mỗi Part trong list có:
```typescript
{
  id: "part_1738593840123",
  name: "Part 1",
  width: 150.50,
  height: 200.30,
  area: 30150.15,
  quantity: 1,
  priority: "medium",
  allowSymmetry: true,
  allowRotation: true,
  geometry: [/* CAD entities */],
  thumbnail: null
}
```

---

**Tác Giả:** AI Assistant  
**Version:** 1.0  
**Date:** Feb 3, 2026  
**Status:** ✅ Working
