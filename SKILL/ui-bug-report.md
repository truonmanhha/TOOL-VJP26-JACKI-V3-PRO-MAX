# UI Bug Report Skill - Mô tả lỗi UI không cần hình ảnh

## Description
Hướng dẫn chi tiết cách mô tả vấn đề UI/UX khi không thể gửi hình ảnh. Sử dụng các phương pháp thay thế để developer hiểu chính xác vấn đề.

## 7 Cách mô tả UI khi không có ảnh

### 1. Mô tả Vị trí chính xác (Location-based)

**Template:**
```
Vị trí: [Khu vực] → [Component] → [Element]
Ví dụ: "Trang chủ → Sidebar trái → Nút 'Add Sheet' thứ 2"
```

**Các vị trí thường gặp:**
- **Header/Navbar**: Logo bên trái, menu giữa, user avatar bên phải
- **Sidebar trái**: Danh sách tools, danh sách parts
- **Sidebar phải**: Properties panel, settings
- **Main content**: Canvas area, workspace
- **Footer/Status bar**: Thanh trạng thái dưới cùng
- **Modals/Dialogs**: Popup giữa màn hình
- **Floating elements**: Toast notifications, tooltips

**Ví dụ mô tả:**
```
❌ Dễ hiểu sai: "Cái nút bị lỗi"
✅ Chính xác: "Nút 'Bắt đầu Nesting' ở toolbar trên cùng, 
   bên phải nút 'Add Part', có màu xanh lá"
```

### 2. Mô tả theo CSS Selector/DOM

**Nếu biết inspect element:**
```
Element: div.container > aside.sidebar > button.btn-primary:nth-child(3)
Class: .nesting-toolbar .start-button
ID: #start-nesting-btn
Data-testid: "start-nesting-button"
```

**Cách tìm selector:**
1. Chuột phải → Inspect element
2. Copy → Copy selector / Copy JS path
3. Dán vào mô tả

### 3. Mô tả Trạng thái và Hành vi (State & Behavior)

**Template:**
```
Trước khi: [Trạng thái ban đầu]
Hành động: [Thao tác ngưởi dùng]
Kết quả thực tế: [Điều gì xảy ra - LỖI]
Kết quả mong muốn: [Điều nên xảy ra]
```

**Ví dụ:**
```
Trước khi: Danh sách parts trống
Hành động: 
  1. Click nút "Upload DXF" ở sidebar trái
  2. Chọn file "part1.dxf"
  3. Click "Open"

Kết quả thực tế: 
  - Loading spinner xoay 2 giây
  - Sau đó danh sách vẫn trống
  - Không có thông báo lỗi

Kết quả mong muốn:
  - File được parse thành công
  - Part xuất hiện trong danh sách
  - Hiển thị preview của part
```

### 4. Sử dụng Text Diagram (ASCII Art)

**Vẽ layout bằng text:**
```
+------------------+------------------+------------------+
|   LOGO           |  Toolbar         |  User Menu       |
|                  |  [New][Save]     |  [Avatar ▼]      |
+------------------+------------------+------------------+
|                                   |                   |
|  Sidebar                          |   Properties      |
|  +-------------+                  |   +-------------+ |
|  | [+] Add     |                  |   | Width: [__] | |
|  | [🗑] Delete  |                  |   | Height:[__] | |
|  |             |                  |   |             | |
|  | Parts:      |                  |   | [Save]      | |
|  | □ Part 1    |                  |   +-------------+ |
|  | □ Part 2    |                  |                   |
|  +-------------+                  |                   |
|                                   |                   |
|  Main Canvas Area                 |                   |
|  +-----------------------------+  |                   |
|  |                             |  |                   |
|  |    [Sheet Preview]          |  |                   |
|  |                             |  |                   |
|  +-----------------------------+  |                   |
|                                   |                   |
+------------------+------------------+------------------+
|  Status: Ready   |  X: 100 Y: 200   |  Zoom: 100%      |
+--------------------------------------------------------+
```

**Công cụ vẽ ASCII:**
- https://asciiflow.com/
- https://textik.com/

### 5. Mô tả Visual chi tiết (Visual Description)

**Template:**
```
Kích thước: [Nhỏ/Vừa/Lớn, hoặc pixel]
Màu sắc: [Màu nền, màu chữ, màu border]
Hình dạng: [Tròn/Vuông/Rounded]
Icon/Text: [Có icon gì, text gì]
Trạng thái: [Normal/Hover/Active/Disabled]
```

**Ví dụ:**
```
Element: Nút "Bắt đầu Nesting"
- Vị trí: Toolbar trên cùng, bên phải
- Kích thước: Khoảng 120x40px
- Màu: Nền xanh lá (#22c55e), chữ trắng
- Hình dạng: Góc bo tròn (rounded)
- Icon: Play icon (▶) bên trái text
- Trạng thái: Disabled (mờ đi, không click được)
```

### 6. Mô tả User Flow (Step-by-step)

**Template:**
```
User Story: Là [user], tôi muốn [mục tiêu], để [lý do]

Các bước:
1. [Bước 1]
2. [Bước 2]
3. [Bước 3]
...

Vấn đề xảy ra tại bước: [Số thứ tự]
Mô tả lỗi: [Chi tiết]
```

**Ví dụ:**
```
User Story: Là operator, tôi muốn xóa một part khỏi danh sách,
           để chỉ nesting các parts cần thiết.

Các bước:
1. Vào trang Nesting Tool
2. Upload 3 parts từ DXF files
3. Click chuột phải vào Part 2
4. Chọn "Delete" từ context menu
5. Xác nhận "Yes" trong dialog

Vấn đề: Sau bước 5, Part 2 vẫn hiển thị trong danh sách
       (phải refresh trang mới mất)

Mong muốn: Part 2 biến mất ngay lập tức sau khi xác nhận xóa
```

### 7. Mô tả Responsive (nếu liên quan đến màn hình)

**Template:**
```
Device: [Desktop/Mobile/Tablet]
Browser: [Chrome/Firefox/Edge/Safari]
Resolution: [1920x1080/1366x768/etc]
Zoom level: [100%/125%/etc]

Vấn đề xảy ra khi: [Resize/Rotate/Zoom]
```

**Ví dụ:**
```
Device: Laptop 15 inch
Browser: Chrome 120
Resolution: 1920x1080
Zoom: 100%

Vấn đề: Khi thu nhỏ cửa sổ xuống 1366px:
- Sidebar bên phải bị đè lên canvas
- Không thể kéo thanh chia cách để resize
- Nút "Start Nesting" bị ẩn mất
```

---

## Template báo cáo lỗi hoàn chỉnh

```markdown
## 🐛 Bug Report

### 1. Thông tin chung
- **Trang/Feature**: [Tên trang hoặc tính năng]
- **Mức độ**: [Critical/High/Medium/Low]
- **Môi trường**: [Production/Staging/Dev]

### 2. Vị trí lỗi
- **Khu vực**: [Header/Sidebar/Main/etc]
- **Component**: [Tên component cụ thể]
- **Selector** (nếu biết): [CSS selector]

### 3. Mô tả trực quan
```
[ASCII diagram hoặc mô tả chi tiết về vị trí, màu sắc, kích thước]
```

### 4. Các bước tái hiện
1. [Bước 1]
2. [Bước 2]
3. [Bước 3]

### 5. Kết quả
- **Thực tế**: [Điều gì đang xảy ra - LỖI]
- **Mong đợi**: [Điều nên xảy ra]

### 6. Thông tin bổ sung
- **Browser**: [Chrome/Firefox/etc]
- **Resolution**: [1920x1080/etc]
- **Error message**: [Nếu có]
- **Console errors**: [Nếu có]

### 7. Gợi ý fix (optional)
[Nếu có ý tưởng cách fix]
```

---

## Ví dụ báo cáo hoàn chỉnh

```markdown
## 🐛 Bug Report: Nút Export bị mất khi có nhiều parts

### 1. Thông tin chung
- **Trang/Feature**: Nesting Workspace
- **Mức độ**: Medium
- **Môi trường**: Production

### 2. Vị trí lỗi
- **Khu vực**: Main Toolbar (trên cùng)
- **Component**: Export button group
- **Selector**: `.toolbar .export-actions`

### 3. Mô tả trực quan
```
Toolbar layout:
[Logo] [New] [Save] [Load] | [Start Nesting] [??? MẤT NÚT EXPORT ???] [Settings]
                            ↑
                    Nên có: [Export ▼] ở đây
```

**Chi tiết visual:**
- Khi parts < 5: Có nút "Export" dropdown màu xám
- Khi parts >= 5: Nút Export biến mất hoàn toàn
- Không bị ẩn (visibility: hidden), mà bị remove khỏi DOM

### 4. Các bước tái hiện
1. Vào trang Nesting
2. Upload 5 parts DXF
3. Nhìn toolbar trên cùng
4. Quan sát: Không có nút Export

### 5. Kết quả
- **Thực tế**: Nút Export không xuất hiện khi có >= 5 parts
- **Mong đợi**: Nút Export luôn hiển thị, chỉ disabled khi chưa có nesting result

### 6. Thông tin bổ sung
- **Browser**: Chrome 120
- **Resolution**: 1920x1080
- **Console error**: Không có
- **Network**: Không có request lỗi

### 7. Gợi ý fix
Có thể điều kiện hiển thị đang check sai:
```javascript
// Có thể đang là:
{parts.length < 5 && <ExportButton />}

// Nên là:
<ExportButton disabled={!hasNestingResult} />
```
```

---

## Tips để mô tả hiệu quả

### ✅ DO:
- ✅ Mô tả vị trí từ ngoài vào trong (Page → Section → Component)
- ✅ Dùng tên class/data-testid nếu biết inspect
- ✅ So sánh "trước/sau" hoặc "có/không"
- ✅ Ghi rõ trình duyệt và resolution
- ✅ Mô tả bằng nhiều cách khác nhau (text + ASCII)
- ✅ Báo cáo cả expected behavior

### ❌ DON'T:
- ❌ "Cái nút kia bị lỗi" (quá chung chung)
- ❌ "Không work" (không nói rõ không work như thế nào)
- ❌ "Giống hôm qua" (developer không nhớ hôm qua là gì)
- ❌ Chỉ mô tả lỗi, không nói kỳ vọng
- ❌ Bỏ qua context (trang nào, khi nào xảy ra)

---

## Công cụ hỗ trợ

### 1. Copy text từ web
```javascript
// Mở console (F12), paste đoạn này để copy text của element
function copyElementText(selector) {
  const el = document.querySelector(selector);
  if (el) {
    navigator.clipboard.writeText(el.innerText);
    console.log('Copied:', el.innerText);
  }
}
// Usage: copyElementText('.error-message')
```

### 2. Lấy computed styles
```javascript
// Lấy CSS styles để mô tả chính xác màu sắc, font
function getStyles(selector) {
  const el = document.querySelector(selector);
  if (el) {
    const styles = window.getComputedStyle(el);
    console.log({
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      width: styles.width,
      height: styles.height
    });
  }
}
// Usage: getStyles('.button-primary')
```

### 3. Lấy DOM structure
```javascript
// Copy HTML structure để paste vào report
function getDOMPath(element) {
  const path = [];
  while (element) {
    let selector = element.tagName.toLowerCase();
    if (element.id) selector += `#${element.id}`;
    if (element.className) selector += `.${element.className.split(' ').join('.')}`;
    path.unshift(selector);
    element = element.parentElement;
  }
  return path.join(' > ');
}
// Click vào element rồi chạy: getDOMPath($0)
```

---

## Tóm tắt

Khi không gửi được ảnh, hãy dùng kết hợp:
1. **Vị trí chính xác** (đường dẫn UI)
2. **Selector** (nếu biết inspect)
3. **State/Behavior** (trước/during/after)
4. **ASCII diagram** (layout tổng quan)
5. **Visual description** (màu sắc, kích thước)
6. **User flow** (các bước tái hiện)
7. **Context** (browser, resolution)

**Quy tắc vàng:** Mô tả nhiều chiều (vị trí + hành vi + visual) sẽ giúp developer hiểu rõ hơn cả ảnh chụp màn hình!
