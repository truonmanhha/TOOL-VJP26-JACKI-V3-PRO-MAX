# 🧪 DRAWING TOOLS - THỰC HÀNH TEST

**Ngày:** February 13, 2026  
**Server:** http://localhost:5173/

---

## 🎬 CHUẨN BỊ

### Bước 1: Server đã chạy
```
✅ npm run dev
✅ VITE v6.4.1 ready
✅ Local: http://localhost:5173/
```

### Bước 2: Mở trình duyệt
- Chrome, Firefox, hoặc Edge
- Truy cập: http://localhost:5173/
- Mở DevTools: `F12` để xem console

---

## 🧪 TEST CASES

### TEST 1: Line Tool
**Mục đích:** Vẽ đường thẳng  
**Các bước:**
1. Nhấn `L` hoặc click nút Line
2. Click điểm A (ví dụ: tọa độ 100, 100)
3. Click điểm B (ví dụ: tọa độ 300, 200)
4. **Kết quả:** Đường thẳng xanh lá xuất hiện từ A đến B

**Dấu hiệu thành công:**
- ✅ Đường thẳng hiển thị màu xanh lá (#00ff88)
- ✅ Entity counter tăng lên 1
- ✅ Console không có lỗi

**Trường hợp thất bại:**
- ❌ Không có gì xuất hiện
- ❌ Console có lỗi
- ❌ Entity counter không tăng

---

### TEST 2: Rectangle Tool
**Mục đích:** Vẽ hình chữ nhật  
**Các bước:**
1. Nhấn `R` hoặc click nút Rectangle
2. Click góc thứ nhất (ví dụ: 50, 50)
3. Click góc đối diện (ví dụ: 250, 150)
4. **Kết quả:** Hình chữ nhật xanh lá xuất hiện

**Dấu hiệu thành công:**
- ✅ Hình chữ nhật filled và outline
- ✅ Kích thước chính xác
- ✅ Entity counter tăng

---

### TEST 3: Circle Tool
**Mục đích:** Vẽ đường tròn  
**Các bước:**
1. Nhấn `C` hoặc click nút Circle
2. Click tâm (ví dụ: 150, 150)
3. Click trên chu vi (ví dụ: 200, 150)
4. **Kết quả:** Đường tròn xanh lá xuất hiện

**Dấu hiệu thành công:**
- ✅ Đường tròn với bán kính chính xác
- ✅ Filled với transparency
- ✅ Entity counter tăng

---

### TEST 4: Polyline Tool - Finish by Enter
**Mục đích:** Vẽ đường gấp khúc với Enter  
**Các bước:**
1. Nhấn `P` hoặc click nút Polyline
2. Click điểm 1 (ví dụ: 50, 200)
3. Click điểm 2 (ví dụ: 150, 100)
4. Click điểm 3 (ví dụ: 250, 200)
5. **Nhấn Enter**
6. **Kết quả:** Đường gấp khúc được lưu

**Dấu hiệu thành công:**
- ✅ 3 đường thẳng nối các điểm
- ✅ Các điểm được hiển thị (hình vuông nhỏ)
- ✅ Entity counter tăng
- ✅ Drawing state reset

---

### TEST 5: Polyline Tool - Finish by Right Click
**Mục đích:** Vẽ đường gấp khúc với Right Click  
**Các bước:**
1. Nhấn `P`
2. Click điểm 1 (100, 100)
3. Click điểm 2 (200, 50)
4. Click điểm 3 (300, 150)
5. **Right Click** (chuột phải)
6. **Kết quả:** Đường gấp khúc được lưu

**Dấu hiệu thành công:**
- ✅ Tương tự TEST 4
- ✅ Right click hoạt động

---

### TEST 6: Spline Tool - Finish by Enter
**Mục đích:** Vẽ đường cong smooth  
**Các bước:**
1. Nhấn `S` hoặc click nút Spline
2. Click 4-5 điểm liên tiếp
3. **Nhấn Enter**
4. **Kết quả:** Đường cong mượt mà được lưu

**Dấu hiệu thành công:**
- ✅ Các điểm được nối bằng đường thẳng (rendering)
- ✅ Entity counter tăng

---

### TEST 7: Zoom In/Out
**Mục đích:** Kiểm tra zoom functionality  
**Các bước:**
1. Vẽ một vài entity
2. Di chuyển chuột đến giữa canvas
3. **Quay bánh xe chuột UP** → Zoom IN
4. **Quay bánh xe chuột DOWN** → Zoom OUT
5. **Kết quả:** Canvas zoom với tâm là vị trí chuột

**Dấu hiệu thành công:**
- ✅ Zoom level hiển thị chính xác (ví dụ: 1.20x, 0.85x)
- ✅ Canvas zoom mượt mà
- ✅ Entity vẫn visible sau zoom

---

### TEST 8: Pan/Drag
**Mục đpur:** Kiểm tra pan functionality  
**Các bước:**
1. Vẽ entity ở góc canvas
2. **Nhấn Middle Mouse Button** (bánh xe chuột)
3. **Kéo chuột** sang một hướng
4. **Thả chuột**
5. **Kết quả:** Canvas dịch chuyển theo hướng kéo

**Dấu hiệu thành công:**
- ✅ Pan mượt mà
- ✅ Grid dịch chuyển đúng
- ✅ Entity vẫn ở đúng vị trí

---

### TEST 9: Grid Toggle
**Mục đích:** Kiểm tra grid display  
**Các bước:**
1. Nhìn canvas - Grid hiển thị
2. Click nút **"Toggle Grid"**
3. Grid biến mất
4. Click lại nút
5. Grid xuất hiện

**Dấu hiệu thành công:**
- ✅ Grid hiển thị/ẩn chính xác
- ✅ Info bar cập nhật (Grid: On/Off)

---

### TEST 10: Clear All
**Mục đích:** Kiểm tra clear functionality  
**Các bước:**
1. Vẽ 5-10 entity
2. Entity counter: 5+
3. Click nút **Rotate (Clear)**
4. **Kết quả:** Tất cả entity biến mất

**Dấu hiệu thành công:**
- ✅ Entity counter → 0
- ✅ Canvas trống
- ✅ Drawing state reset

---

### TEST 11: Keyboard Shortcuts
**Mục đích:** Kiểm tra các shortcut  
**Các bước:**
1. Nhấn `L` → Nút Line được highlight
2. Nhấn `R` → Nút Rectangle được highlight
3. Nhấn `C` → Nút Circle được highlight
4. Nhấn `P` → Nút Polyline được highlight
5. Nhấn `S` → Nút Spline được highlight
6. Nhấn `Esc` → Tất cả nút cancel (Pointer mode)

**Dấu hiệu thành công:**
- ✅ Tất cả shortcuts hoạt động
- ✅ UI cập nhật ngay lập tức

---

### TEST 12: Cancel Tool (Esc)
**Mục đích:** Hủy công cụ đang chọn  
**Các bước:**
1. Nhấn `L` (Line tool active)
2. Click 1 điểm (drawing state có 1 điểm)
3. **Nhấn Esc**
4. **Kết quả:** Drawing state reset, trở về Pointer mode

**Dấu hiệu thành công:**
- ✅ Drawing state cleared
- ✅ Tool deactivated
- ✅ Có thể vẽ công cụ khác

---

### TEST 13: Entity Display
**Mục đích:** Kiểm tra entity list  
**Các bước:**
1. Vẽ 3 entity (Line, Rect, Circle)
2. Nhìn thanh thông tin dưới
3. **Kết quả:** "Entities: 3" hiển thị

**Dấu hiệu thành công:**
- ✅ Entity counter chính xác
- ✅ Cập nhật real-time

---

### TEST 14: Crosshair Cursor
**Mục đích:** Kiểm tra con trỏ  
**Các bước:**
1. Nhấn `L` để bật công cụ
2. Di chuyển chuột trên canvas
3. **Kết quả:** Con trỏ thay đổi thành crosshair

**Dấu hiệu thành công:**
- ✅ Cursor thay đổi khi tool active
- ✅ Trở lại normal cursor khi cancel

---

### TEST 15: Multiple Drawing
**Mục đích:** Vẽ nhiều entity liên tiếp  
**Các bước:**
1. Vẽ Line
2. Vẽ Rectangle
3. Vẽ Circle
4. Vẽ Polyline
5. Vẽ Spline
6. **Kết quả:** Tất cả entity xuất hiện

**Dấu hiệu thành công:**
- ✅ Entity counter: 5
- ✅ Tất cả entity visible
- ✅ Không xung đột

---

## 📊 TEST MATRIX

| Test # | Feature | Expected | Status |
|--------|---------|----------|--------|
| 1 | Line Tool | ✅ Draw | ⏳ Pending |
| 2 | Rectangle Tool | ✅ Draw | ⏳ Pending |
| 3 | Circle Tool | ✅ Draw | ⏳ Pending |
| 4 | Polyline (Enter) | ✅ Finish | ⏳ Pending |
| 5 | Polyline (R-Click) | ✅ Finish | ⏳ Pending |
| 6 | Spline (Enter) | ✅ Finish | ⏳ Pending |
| 7 | Zoom | ✅ Work | ⏳ Pending |
| 8 | Pan | ✅ Work | ⏳ Pending |
| 9 | Grid Toggle | ✅ Work | ⏳ Pending |
| 10 | Clear All | ✅ Work | ⏳ Pending |
| 11 | Keyboard | ✅ All OK | ⏳ Pending |
| 12 | Cancel (Esc) | ✅ Work | ⏳ Pending |
| 13 | Entity List | ✅ Display | ⏳ Pending |
| 14 | Crosshair | ✅ Show | ⏳ Pending |
| 15 | Multiple | ✅ All OK | ⏳ Pending |

---

## 🐛 BUG REPORT TEMPLATE

Nếu tìm thấy lỗi, vui lòng báo cáo theo format:

```markdown
### Bug Report

**Title:** [Tên lỗi]  
**Severity:** Critical / High / Medium / Low  

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:**
[Mong muốn gì]

**Actual Result:**
[Thực tế xảy ra gì]

**Console Error:**
[Paste error từ F12 console]

**Screenshot:**
[Nếu có]

**Browser/OS:**
[Chrome/Firefox/Edge + Windows/Mac/Linux]
```

---

## ✅ TEST COMPLETE CHECKLIST

After all tests pass, check these:

- [ ] All 15 test cases passed
- [ ] No console errors
- [ ] No performance issues
- [ ] Smooth interaction
- [ ] Responsive UI
- [ ] Grid working
- [ ] Zoom/Pan smooth
- [ ] All entities render correctly
- [ ] Entity counter accurate
- [ ] Info bar accurate

---

## 📝 TESTING NOTES

### Performance Observations
- Canvas rendering should be smooth (60 FPS)
- No lag when drawing
- Zoom should be responsive
- Pan should be fluid

### UI Observations
- Buttons should highlight correctly
- Counters should update real-time
- Info bar should show accurate info
- Grid should align properly

### Functionality Observations
- All tools should work
- All shortcuts should work
- Clear should remove all
- State should reset properly

---

## 🎯 NEXT STEPS AFTER TESTING

1. **If all pass:** ✅ Mark as "Production Ready"
2. **If some fail:** Document issues and create fixes
3. **If performance issues:** Optimize canvas rendering
4. **If UI issues:** Refine styling/layout

---

**Start Testing Now!**  
🚀 **Server Running at:** http://localhost:5173/

---

*Generated: February 13, 2026*
