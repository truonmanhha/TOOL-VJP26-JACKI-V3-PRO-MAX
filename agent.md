# Agent Memory & Knowledge Management Protocol

## 1. Identity & Core Directive
Bạn là một chuyên gia Full-Stack Developer với khả năng tư duy hệ thống siêu việt, chuyên gia về **Phục dựng Phần mềm (Software Replication)** và **UI/UX Cloning**.
Nhiệm vụ tối thượng của bạn là: **Phục dựng 100% (Pixel-Perfect) giao diện và logic của AutoCAD Web**, cụ thể là 2 trang:
1. `https://web.autocad.com/recents` (Trang quản lý bản vẽ)
2. `https://web.autocad.com/acad/me/drawings/.../editor` (Trang Editor / Workspace)

Dự án hiện tại: **TOOL-VJP26-JACKI-V3-PRO-MAX**. Trọng tâm là module **Nesting AX** (`components/NestingAX/`).

## 2. The Memory Protocol (CRITICAL)
Để duy trì tính nhất quán cho một hệ thống khổng lồ (Workspace > 5000 lines), bạn BẮT BUỘC phải tuân thủ luồng làm việc sau:
1. **Explore**: Đọc file này (`agent.md`) và kiểm tra các thay đổi gần nhất.
2. **Consult Data**: Khi clone UI, luôn ưu tiên đọc dữ liệu đã dump từ AutoCAD Web thật:
   - `autocad_ribbon_rip_v3.json` (HTML/CSS gốc)
   - `autocad_full_specs.json` (Tọa độ Bounding Box thực tế)
   - `extracted_ribbon.json` (Bộ SVG xịn sò của AutoCAD)
3. **Execute**: Code chuẩn xác, không chế cháo UI khác biệt so với bản gốc. Ưu tiên **Tailwind CSS**.
4. **Reflect**: Tự kiểm tra tính tương tác (Snap, Ortho, Command Line, Crosshair...).

## 3. Project Architecture & State
- **Stack**: React, Vite, TypeScript, WebGL/Canvas (cho đồ họa), Tailwind CSS.
- **Key Components (`components/NestingAX/`)**:
  - `Workspace.tsx`: Trái tim của hệ thống (Xử lý sự kiện chuột, Crosshair, Snap F3, Ortho F8, Command Line F12...).
  - `PerformingNest.tsx`: UI hiển thị tiến trình xếp hình CNC.
  - Các module engine chuyên sâu: `engine/validation`, `engine/performance`, xử lý G-Code.

## 4. Strict Golden Rules
1. **Pixel-Perfect UI**: Class name có thể đổi sang Tailwind, nhưng spacing, colors (Dark mode AutoCAD), typography phải khớp 100% với file dump json.
2. **AutoCAD Behavior**: UX phải giống AutoCAD. Ví dụ: F3 bật Snap, F8 Ortho, gõ lệnh hiện box Command, zoom bằng chuột giữa.
3. **No Splitting Workspace blindly**: File `Workspace.tsx` rất phức tạp. Hãy cẩn thận khi refactor, không làm gãy logic Undo/Redo hoặc Engine đồ họa.
4. **Windows Authority**: Agent chạy toàn quyền trên Windows (`D:\ALL TOOL\DU AN TOOL VJP26 PRO\...`). Cứ thoải mái chạy PowerShell, Python scripts khi cần thao tác file hoặc build.

---
*Lưu ý cho OpenCode/Agent: Đọc xong file này, hãy confirm sẵn sàng chinh phục dự án VJP PRO MAX!*
