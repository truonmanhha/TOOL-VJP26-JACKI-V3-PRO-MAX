# 🎯 HƯỚNG DẪN NHANH: THÊM CHI TIẾT VÀO NESTING

## ⚠️ LƯU Ý QUAN TRỌNG

### Hai phím khác nhau, hai chức năng khác nhau:

| Phím | Chức năng | Khi nào dùng |
|------|-----------|--------------|
| **ENTER ⏎** | Mở Bảng Tham Số | Sau khi chọn đối tượng xong |
| **Right-Click 🖱️** | Kết thúc và mở Modal | Sau khi đã thêm đủ chi tiết |

---

## 📋 QUY TRÌNH CHUẨN

### Bước 1: Bắt đầu
```
Click nút "NEW NEST LIST"
    ↓
Modal hiện ra với 4 panel
    ↓
Click "Thêm Chi Tiết Từ Bản Vẽ"
    ↓
Modal đóng, chế độ chọn hình BẬT
```

### Bước 2: Chọn đối tượng
```
Click vào các Line/Circle/Rectangle trên canvas
    ↓
Đối tượng highlight màu xanh
    ↓
Có thể chọn nhiều đối tượng liền
```

### Bước 3: Nhấn ENTER (Quan trọng!)
```
Nhấn phím ENTER ⏎
    ↓
Bảng "Thông Số Chi Tiết" hiện ra
    ↓
Xem preview kích thước (W × H × Area)
```

### Bước 4: Nhập thông tin
```
Nhập tên chi tiết (vd: "Cạnh Bên Tủ")
    ↓
Chọn chế độ số lượng:
  ○ Max Possible (tối đa)
  ● Custom Quantity (tùy chỉnh)
    ↓
Nếu chọn Custom, nhập số lượng
```

### Bước 5: Xác nhận
```
Click "Xác Nhận" hoặc nhấn ENTER
    ↓
Chi tiết được thêm vào danh sách!
    ↓
Bảng đóng, quay lại chế độ chọn
```

### Bước 6: Thêm tiếp hoặc Hoàn tất

#### Option A: Thêm chi tiết khác
```
Chọn đối tượng khác
    ↓
Nhấn ENTER
    ↓
Lặp lại Bước 3-5
```

#### Option B: Hoàn tất và xem danh sách
```
Right-Click (chuột phải) 🖱️
    ↓
Modal mở lại
    ↓
Panel 2 hiển thị tất cả chi tiết đã thêm
```

---

## 🔴 LỖI THƯỜNG GẶP

### Lỗi 1: "Tôi Right-Click nhưng không thấy Bảng Tham Số"
**Nguyên nhân:** Right-Click dùng để KẾT THÚC chế độ chọn, không phải mở Bảng Tham Số.

**Giải pháp:** Dùng phím **ENTER** để mở Bảng Tham Số!

```
SAI: Select → Right-Click (❌ không hiện bảng)
ĐÚNG: Select → ENTER (✅ bảng hiện ra)
```

### Lỗi 2: "Radial Menu (menu tròn) hiện lên chắn màn hình"
**Nguyên nhân:** Đã fix trong version mới!

**Đã sửa:** 
- Khi đang chế độ chọn, Right-Click **KHÔNG** hiện Radial Menu nữa
- Radial Menu chỉ hiện khi KHÔNG ở chế độ nesting selection

### Lỗi 3: "Chi tiết tự động hiện trong danh sách mà chưa nhập thông số"
**Nguyên nhân:** Không có bug này! Code không tự động thêm.

**Kiểm tra lại:** 
- Có nhấn ENTER chưa? (cần thiết để mở bảng)
- Có click "Xác Nhận" trong bảng chưa? (cần thiết để thêm vào list)
- Nếu bỏ qua 2 bước này → chi tiết KHÔNG được thêm

---

## 🎬 VIDEO DEMO (Mô phỏng bằng text)

```
[Scene: Canvas có 3 đối tượng: Line1, Circle, Rectangle]

User: *Click "NEW NEST LIST"*
UI: Modal hiện, 4 panel trống

User: *Click "Thêm Chi Tiết Từ Bản Vẽ"*
UI: Modal ẩn
Prompt: "🎯 Select parts → Press ENTER to set params → Right-Click when done"

User: *Click Line1*
UI: Line1 highlight xanh

User: *Nhấn ENTER ⏎*
UI: ✨ BẢNG THAM SỐ HIỆN RA ✨
    ┌────────────────────────────┐
    │ 📦 Thông Số Chi Tiết       │
    ├────────────────────────────┤
    │ Preview: 500 × 100 (50000) │
    │ Tên: [Part 1___________]   │
    │ ● Custom: [1]              │
    │ [Hủy] [✓ Xác Nhận]         │
    └────────────────────────────┘

User: *Sửa tên → "Mặt Trước", quantity → 3*
User: *Click "Xác Nhận"*
UI: Bảng đóng
Log: "✅ Added: Mặt Trước (500×100) × 3"
Prompt: "🎯 Select more parts + ENTER, or Right-Click to finish"

User: *Click Circle*
User: *Nhấn ENTER*
UI: Bảng hiện lại (name tự động = "Part 2")

User: *Nhập "Mặt Tròn", quantity 2, click OK*
UI: Added successfully

User: *Right-Click 🖱️*
UI: ✨ MODAL MỞ LẠI ✨
Panel 2 hiển thị:
    📏 Mặt Trước (500×100) × 3
    ⭕ Mặt Tròn (200×200) × 2

User: "Perfect! Giờ có thể chỉnh sửa hoặc Run Nesting"
```

---

## 📌 TÓM TẮT 1 DÒNG

**Select objects → ENTER → Input params → OK → (Repeat or Right-Click to finish)**

---

## 🎓 TIPS & TRICKS

### Tip 1: Multi-select
Bạn có thể chọn nhiều đối tượng trước khi nhấn ENTER. Tất cả sẽ được tính chung vào 1 part.

### Tip 2: Cancel anytime
Nhấn ESC hoặc click "Hủy" trong bảng → Không thêm part, quay lại chế độ chọn.

### Tip 3: Số lượng tối đa
Chọn "Max Possible" nếu muốn nested tối đa chi tiết lên tấm (hệ thống tự tính).

### Tip 4: Kiểm tra trước khi nest
Sau khi thêm xong, có thể edit trực tiếp trong Panel 2:
- Double-click tên để sửa
- Click icon ✏️ để sửa số lượng
- Click 🗑️ để xóa

---

## 🆘 TROUBLESHOOTING

### "Tôi không thấy Bảng Tham Số khi nhấn ENTER"
**Check:**
- [ ] Đã click chọn ít nhất 1 đối tượng chưa? (phải có highlight xanh)
- [ ] Prompt có hiển thị "Select parts..." không?
- [ ] Console log có thông báo lỗi không? (F12 để mở)

### "Radial Menu vẫn hiện khi tôi Right-Click"
**Check:**
- [ ] Đảm bảo code đã update (version mới)
- [ ] Reload page (Ctrl+R)
- [ ] Console log có "🚫 Radial Menu suppressed" không?

### "Chi tiết không xuất hiện trong Panel 2"
**Check:**
- [ ] Đã click "Xác Nhận" trong bảng chưa?
- [ ] Đã Right-Click để mở lại modal chưa?
- [ ] Console log có "✅ Added: ..." không?

---

**Phiên bản:** 2.1 - Fixed Radial Menu Conflict  
**Ngày cập nhật:** 3 Feb 2026  
**Trạng thái:** ✅ Đã test, hoạt động ổn định
