# 📖 USER GUIDE - New Nest List

**Hướng Dẫn Sử Dụng Module New Nest List**

---

## 🎯 Giới Thiệu

Module **New Nest List** giúp bạn tối ưu hóa việc xếp các chi tiết cắt lên tấm ván để tiết kiệm vật liệu. Bạn có thể:
- ✅ Chọn các chi tiết từ bản vẽ
- ✅ Chọn tấm ván để xếp
- ✅ Cấu hình các thông số tối ưu
- ✅ Xem kết quả trực quan

---

## 🚀 Bắt Đầu

### Bước 1: Mở Công Cụ

Nhấn nút **"NEW NEST LIST"** trên thanh công cụ (Toolbar)

![Button](https://via.placeholder.com/200x50?text=NEW+NEST+LIST)

### Bước 2: Cửa Sổ Hiện Ra

Một cửa sổ mới hiện lên với 4 phần:
1. **Thanh Công Cụ** - Các nút chức năng
2. **Danh Sách Chi Tiết** - Chi tiết cần cắt
3. **Danh Sách Tấm Ván** - Tấm ván để xếp
4. **Nút Thao Tác** - Đóng và Chạy

---

## 📝 Hướng Dẫn Chi Tiết

### A. Thêm Chi Tiết (Parts)

#### Bước 1: Click Nút "Thêm Chi Tiết Từ Bản Vẽ"
- Cửa sổ sẽ tự động ẩn
- Con trỏ chuột đổi thành dấu + (crosshair)

#### Bước 2: Chọn Chi Tiết Trên Bản Vẽ
Có 2 cách chọn:
- **Cách 1:** Click vào từng đối tượng
- **Cách 2:** Kéo chuột để chọn nhiều đối tượng cùng lúc

💡 **Mẹo:** Các đối tượng được chọn sẽ có viền xanh lá nét đứt

#### Bước 3: Xác Nhận
- Nhấn phím **Enter** để xác nhận
- Hoặc nhấn **Esc** để hủy

#### Bước 4: Nhập Thông Số

Cửa sổ "Thông Số Chi Tiết" hiện ra, điền các thông tin:

| Thông Số | Mô Tả | Ví Dụ |
|----------|-------|-------|
| **Tên** | Tên chi tiết | Cánh tủ A |
| **Số lượng** | Số lượng cần cắt | 10 |
| **Ưu tiên** | Độ ưu tiên (1-5) | 3 (trung bình) |
| **Đối xứng** | Có đối xứng không | Không |
| **Xoay** | Cho phép xoay | Bất kỳ |
| **Chi tiết nhỏ** | Đánh dấu chi tiết nhỏ | ☐ |

#### Bước 5: Nhấn "Xác Nhận"
Chi tiết sẽ xuất hiện trong danh sách

---

### B. Thêm Tấm Ván (Sheets)

#### Bước 1: Click Nút "Thêm Khổ Ván Từ Bản Vẽ"

#### Bước 2: Chọn Viền Tấm Ván
- Chọn hình chữ nhật đại diện cho tấm ván

#### Bước 3: Nhập Thông Số

| Thông Số | Mô Tả | Ví Dụ |
|----------|-------|-------|
| **Tên vật liệu** | Loại gỗ/ván | MDF 18mm |
| **Kích thước** | Tự động từ bản vẽ | 2440 × 1220 |
| **Độ dày** | Độ dày (mm) | 18 |
| **Số lượng** | Số tấm có sẵn | 5 |

---

### C. Cài Đặt Nâng Cao

Click nút **"Cài Đặt Nesting"** để mở cấu hình

#### Tab 1: Chung (General)

**Thuật Toán:**
- 🔲 Hình chữ nhật (nhanh nhất)
- 🔲 Hình dạng thực (chính xác)
- ✅ **Vero (khuyên dùng)** - Cân bằng tốc độ và chất lượng

**Loại Đối Tượng:**
- ✅ Hình học
- 🔲 Đường dao

**Khoảng Cách (mm):**
- Khoảng cách giữa các chi tiết: `5 mm`

**Lề (mm):**
- Khoảng cách từ cạnh tấm: `10 mm`

#### Tab 2: Chiến Lược (Strategy)

**Góc Bắt Đầu:**
```
┌─────────┐
│ 1     2 │  1: Trên-Trái
│         │  2: Trên-Phải  
│ 3     4 │  3: Dưới-Trái ✅
└─────────┘  4: Dưới-Phải
```

**Thứ Tự Xếp:**
- ✅ Tối ưu nhất (Best utilization)
- 🔲 Theo kích thước
- 🔲 Theo ưu tiên

**Hướng Phần Thừa:**
- Ngang | Dọc | Tự động ✅

**Cho Phép Xoay:**
- ✅ Bật

#### Tab 3: Mở Rộng (Extensions)

- 🔲 Gộp các chi tiết giống nhau
- ✅ Khoan lỗ trước khi cắt
- ✅ Tối ưu đường dao
- ✅ Sử dụng phần thừa

---

### D. Chạy Nesting

#### Bước 1: Kiểm Tra
Đảm bảo đã có:
- ✅ Ít nhất 1 chi tiết
- ✅ Ít nhất 1 tấm ván

#### Bước 2: Click Nút "Chạy Nesting"
- Màn hình hiện thanh tiến trình
- Chờ hệ thống tính toán (vài giây)

#### Bước 3: Xem Kết Quả
Hệ thống sẽ:
- Vẽ kết quả lên bản vẽ
- Hiển thị % sử dụng vật liệu
- Hiển thị số tấm đã dùng

---

## 🎨 Chỉnh Sửa Sau Khi Thêm

### Sửa Thông Tin Chi Tiết

Trong **Danh Sách Chi Tiết**, bạn có thể:
- Click vào ô để sửa tên
- Thay đổi số lượng
- Điều chỉnh ưu tiên
- Chọn lại đối xứng/xoay
- Xóa chi tiết (nút 🗑️)

### Sửa Thông Tin Tấm Ván

Trong **Danh Sách Tấm Ván**, bạn có thể:
- Sửa tên vật liệu
- Thay đổi độ dày
- Điều chỉnh số lượng
- Xóa tấm (nút 🗑️)

---

## ⌨️ Phím Tắt

| Phím | Chức Năng |
|------|-----------|
| **Enter** | Xác nhận chọn đối tượng |
| **Esc** | Hủy thao tác hiện tại |
| **Ctrl+N** | Mở New Nest List (kế hoạch) |

---

## 💡 Mẹo Sử Dụng

### Tối Ưu Hóa Kết Quả

1. **Sắp xếp ưu tiên:**
   - Chi tiết quan trọng: Ưu tiên 1-2
   - Chi tiết thông thường: Ưu tiên 3
   - Chi tiết dư: Ưu tiên 4-5

2. **Cho phép xoay:**
   - Bật "Cho phép xoay" để tăng hiệu quả
   - Tắt nếu chi tiết có hướng vân gỗ

3. **Điều chỉnh khoảng cách:**
   - Khoảng cách nhỏ = tiết kiệm vật liệu
   - Khoảng cách lớn = dễ cắt, an toàn hơn

4. **Sử dụng phần thừa:**
   - Bật "Sử dụng phần thừa" để tận dụng phế liệu

### Tránh Lỗi Thường Gặp

❌ **Không chạy được:**
- Kiểm tra đã có chi tiết và tấm ván chưa

❌ **Kết quả không tối ưu:**
- Thử thuật toán khác (Vero > True Shape > Rectangular)
- Giảm khoảng cách và lề
- Bật "Cho phép xoay"

❌ **Chi tiết không vừa:**
- Tăng kích thước tấm ván
- Giảm kích thước chi tiết
- Giảm số lượng chi tiết mỗi lần

---

## 🔍 Ví Dụ Thực Tế

### Ví Dụ 1: Cắt Cánh Tủ

**Yêu cầu:**
- 10 cánh tủ A (600 × 800 mm)
- 5 cánh tủ B (400 × 600 mm)
- Tấm MDF 18mm (2440 × 1220 mm)

**Các bước:**
1. Vẽ 2 hình chữ nhật: 600×800 và 400×600
2. Click "Thêm Chi Tiết", chọn hình 600×800
   - Tên: Cánh tủ A
   - Số lượng: 10
   - Ưu tiên: 1
3. Click "Thêm Chi Tiết", chọn hình 400×600
   - Tên: Cánh tủ B
   - Số lượng: 5
   - Ưu tiên: 2
4. Click "Thêm Khổ Ván", chọn tấm 2440×1220
   - Tên: MDF 18mm
   - Độ dày: 18
   - Số lượng: 3
5. Click "Chạy Nesting"
6. Xem kết quả: Có thể xếp được 8 cánh A và 4 cánh B trên 1 tấm

### Ví Dụ 2: Chi Tiết Có Hình Dạng Phức Tạp

**Yêu cầu:**
- Chi tiết có hình dạng bất kỳ (không phải chữ nhật)

**Các bước:**
1. Vẽ hình dạng chi tiết trên canvas
2. Click "Thêm Chi Tiết"
3. Chọn tất cả các đường viền của chi tiết
4. Nhấn Enter
5. Điền thông số và OK
6. Thuật toán sẽ tính theo hình dạng thực (True Shape)

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

### Q1: Làm sao biết kết quả đã tối ưu chưa?
**A:** Xem % sử dụng vật liệu:
- 80-95%: Rất tốt ✅
- 70-80%: Tốt 👍
- 60-70%: Chấp nhận được 👌
- <60%: Cần cải thiện ⚠️

### Q2: Tôi có thể sửa kết quả sau khi nesting không?
**A:** Hiện tại chưa hỗ trợ. Tính năng này sẽ có trong phiên bản sau.

### Q3: Nesting mất bao lâu?
**A:** 
- Chi tiết đơn giản: < 5 giây
- Chi tiết phức tạp: 10-30 giây
- Rất nhiều chi tiết: 30-60 giây

### Q4: Tôi có thể lưu dự án không?
**A:** Tính năng này đang được phát triển và sẽ có trong phiên bản sau.

### Q5: Có giới hạn số lượng chi tiết không?
**A:** Không có giới hạn cứng, nhưng:
- < 50 chi tiết: Rất nhanh
- 50-100 chi tiết: Nhanh
- 100-500 chi tiết: Trung bình
- > 500 chi tiết: Có thể chậm

---

## 🆘 Hỗ Trợ

### Gặp Vấn Đề?

1. **Không chọn được chi tiết:**
   - Đảm bảo đã click đúng nút "Thêm Chi Tiết"
   - Kiểm tra con trỏ chuột đã đổi thành dấu +

2. **Kết quả lỗi:**
   - Restart backend server
   - Kiểm tra kết nối mạng
   - Thử lại với ít chi tiết hơn

3. **Cần thêm trợ giúp:**
   - Xem tài liệu đầy đủ: `README.md`
   - Xem ví dụ code: `INTEGRATION_EXAMPLES.tsx`
   - Liên hệ team support

---

## 📞 Liên Hệ

**Email Support:** [support@vjp26.com]
**Documentation:** See README.md
**Version:** 1.0.0

---

## ✨ Cảm Ơn!

Cảm ơn bạn đã sử dụng **New Nest List Module**!

Chúc bạn làm việc hiệu quả! 🚀

---

**Last Updated:** February 3, 2026
