---
name: clone-website
description: Phân tích và nhân bản giao diện từ URL thành mã nguồn Next.js/React + Tailwind + shadcn/ui. Sử dụng khi cần clone landing page, reverse-engineer UI đối thủ, hoặc tạo template nhanh từ mẫu có sẵn.
---

# Clone Website Skill

Kỹ năng này cho phép AI tự động giải mã cấu trúc UI/UX từ một URL và tái tạo nó thành một hệ thống component hiện đại.

## Quy trình thực hiện (Multi-agent Pipeline)

1. **Giai đoạn Nghiên cứu (Researcher Agent):**
   - Sử dụng `web_fetch` hoặc script `scripts/extract_design.py` để lấy:
     - **Colors**: Primary, secondary, accents, background, surface.
     - **Typography**: Font family, sizes, weights, line-heights.
     - **Layout Structure**: Flex/Grid patterns, spacing, responsiveness.
     - **Assets**: Icons (SVG), images, logos.

2. **Giai đoạn Kiến trúc (Architect Agent):**
   - Phân chia trang web thành các atomic components.
   - Tạo file `component-spec.md` mô tả từng phần (props, state, styles).
   - Thiết kế hệ thống `theme` Tailwind để khớp với site gốc.

3. **Giai đoạn Xây dựng (Builder Agent):**
   - Xây dựng từng component song song sử dụng **shadcn/ui** làm nền tảng.
   - Viết mã nguồn sạch, dễ bảo trì, đảm bảo responsive.

4. **Giai đoạn Tích hợp (Integrator Agent):**
   - Ghép nối các component vào layout chính.
   - Kiểm tra độ tương đồng (Pixel-perfect) và logic tương tác.

## Tiêu chuẩn kỹ thuật

- **Tech Stack**: Next.js 14/15, React, Tailwind CSS v3/v4, shadcn/ui.
- **Styling**: Ưu tiên sử dụng Tailwind classes thay vì CSS thuần.
- **Components**: Chia nhỏ, tái sử dụng, tách biệt logic và UI.

## Gợi ý lệnh (Triggers)
- "/clone-website https://example.com"
- "Rebuild UI của trang này sang Next.js + shadcn"
- "Clone landing page đối thủ và đổi sang brand color của tôi"
