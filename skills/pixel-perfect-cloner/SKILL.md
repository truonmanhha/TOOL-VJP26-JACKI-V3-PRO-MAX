---
name: pixel-perfect-cloner
description: Chuyên gia sao chép giao diện web 1:1 (Pixel-perfect). Sử dụng dữ liệu từ Playwright, screenshots và source code thực tế để tái tạo cấu trúc HTML/CSS không sai lệch 1 pixel.
---

# Pixel-Perfect Cloner Skill

Kỹ năng này biến AI thành một kỹ sư Reverse Engineering giao diện, tập trung vào độ chính xác tuyệt đối.

## Quy trình thực hiện (The 1:1 Protocol)

### 1. Visual & Structural Analysis
- **Screenshot Analysis**: Sử dụng Agent Vision để xác định "vibe", độ bóng, và khoảng cách tương đối.
- **Source Inspection**: Đọc file `.html` và `.js` (nếu có) để lấy ID, Class và cấu trúc lồng nhau (Hierarchy) của các thẻ div.
- **CSS Variable Extraction**: Tìm và copy toàn bộ `:root` variables (`--color`, `--spacing`, `--shadow`).

### 2. Style Harvesting
- **Computed Styles**: Nếu có thể chạy Playwright, hãy lấy `window.getComputedStyle(element)` cho các thành phần quan trọng.
- **Box Model Sync**: Phải dùng đúng các giá trị `padding`, `margin`, `border-width` thực tế. Tuyệt đối không làm tròn hoặc dùng giá trị "na ná" của Tailwind.
- **Font Stack**: Sử dụng đúng font-family và weight (ví dụ: Artifakt Element 500 cho tiêu đề).

### 3. Asset Mirroring
- **SVG Paths**: Trích xuất mã path của các icon trực tiếp từ source.
- **Animations**: Tìm kiếm hàm `cubic-bezier` và `ms` duration để đồng bộ cảm giác mượt mà (UX).

### 4. Implementation Guidelines
- **CSS-First**: Ưu tiên sử dụng custom CSS classes (`.acad-header`) kết hợp với CSS Variables thay vì Utility classes nếu Utility không đáp ứng được độ chính xác 1:1.
- **DOM Hierarchy**: Cấu trúc React/HTML sinh ra phải có số lớp thẻ và cách lồng ghép giống 100% bản gốc.

## Nguyên tắc vàng
- "Gần giống" = Thất bại.
- "1:1" = Thành công.
- Không bao giờ đoán nếu có thể đọc được dữ liệu thật.
