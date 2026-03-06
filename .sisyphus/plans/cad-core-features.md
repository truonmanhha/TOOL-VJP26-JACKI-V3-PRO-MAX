# Kế hoạch Hoàn thiện tính năng CAD Core (OSNAP, Modify, Layer)

## TL;DR

> **Quick Summary**: Nâng cấp hệ thống CAD hiện tại bằng cách bổ sung 3 tính năng cốt lõi: Bắt điểm (OSNAP) thời gian thực, Các công cụ chỉnh sửa hình học (Modify Tools: Trim, Extend, Offset...), và Quản lý Layer. Tất cả UI tương tác sẽ được tích hợp vào hệ thống Radial Menu sẵn có.
> 
> **Deliverables**:
> - Hệ thống Bắt điểm (Endpoint, Midpoint, Center, Intersection) tích hợp vào `DrawingWorkspace`.
> - State machine cho các lệnh Modify (Trim, Extend, Offset) trên Canvas.
> - Layer Manager cơ bản (quản lý state layer, color, visibility).
> - Giao diện điều khiển mở rộng trong `RadialMenu.tsx`.
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Cập nhật Types/State -> Core Logic (OSNAP/Layer) -> UI Radial Menu -> Modify Tools Interaction

---

## Context

### Original Request
Người dùng muốn hoàn thiện Tool CAD của mình để giống AutoCAD hơn, nhận thấy rằng hệ thống hiện tại mới có phần vẽ cơ bản mà thiếu các tính năng quan trọng.

### Interview Summary
**Key Discussions**:
- **Tính năng ưu tiên**: Bắt điểm (OSNAP), Modify Tools (Trim, Extend, Offset...), và Layer Manager.
- **UI UX**: Tích hợp hoàn toàn vào **Radial Menu** (Menu vòng) đang có sẵn, không dùng thanh công cụ rời rạc.

**Research Findings**:
- Codebase đã có sẵn các file `types/CADTypes.ts` định nghĩa rất đầy đủ các interface (SnapType, CommandState, CADLayer) nhưng chưa implement logic.
- File `geometry.ts` và `CADEngine.ts` đã có các công cụ toán học nền tảng (intersection, offset...).
- `RadialMenu.tsx` hỗ trợ hệ thống menu nhiều cấp (sub, sub-sub) bằng mảng `MENU_DATA` động.

### Metis Review
**Identified Gaps** (addressed):
- *Gap 1 (Scope Creep)*: Modify Tools có rất nhiều lệnh. Cần giới hạn danh sách cụ thể (Trim, Extend, Offset, Move, Copy) tránh lan man sang Array hay Stretch phức tạp.
- *Gap 2 (OSNAP Performance)*: Tính toán intersection và nearest points liên tục mỗi lần di chuột sẽ gây lag. Phải dùng K-D tree hoặc giới hạn radius tìm kiếm. Tạm thời giới hạn kiểm tra trên mảng `cadEntities`.
- *Gap 3 (Layer Data Structure)*: Hiện các entities chưa gán layerId. Cần backfill hoặc default layer cho các hình đã vẽ.

---

## Work Objectives

### Core Objective
Biến môi trường vẽ 2D cơ bản hiện tại thành một môi trường CAD có độ chính xác cao (nhờ OSNAP), có khả năng chỉnh sửa tinh chỉnh (Modify) và tổ chức bài bản (Layer).

### Concrete Deliverables
- `services/SnapEngine.ts` (mới): Module tính toán bắt điểm.
- `DrawingWorkspace.tsx` (cập nhật): Tích hợp Snap cursor, Layer render, và Command state machine.
- `RadialMenu.tsx` (cập nhật): Thêm các options điều khiển bật/tắt OSNAP, chọn công cụ Modify, chọn Layer hiện tại.

### Definition of Done
- [ ] OSNAP hoạt động (hiện icon vuông cho endpoint, tam giác cho midpoint, X cho intersection khi đưa chuột lại gần).
- [ ] Có thể chọn lệnh Trim và click vào đối tượng để cắt (dựa trên giới hạn bởi hình khác).
- [ ] Có thể chuyển đổi layer hiện hành từ Radial Menu, các đối tượng mới vẽ sẽ có màu của layer đó.

### Must Have
- OSNAP phải hoạt động real-time mượt mà, không giật lag.
- Radial Menu phải đóng vai trò là Command Hub chính.

### Must NOT Have (Guardrails)
- KHÔNG tạo thêm các thanh Toolbar nổi, Sidebar mới (Chỉ dùng Radial Menu).
- KHÔNG thêm tính năng Hatch hoặc Dimensioning trong plan này.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: NO (UI canvas complex)
- **Agent-Executed QA**: Bắt buộc. Mọi task sẽ cung cấp kịch bản rõ ràng cho executing agent. Agent sẽ chạy Dev Server và sử dụng Playwright để tương tác với Canvas và Radial Menu, sau đó chụp ảnh màn hình (Screenshot).

### QA Policy
- **Frontend/UI**: Dùng Playwright skill.
  - Tương tác chuột phức tạp: Click phải mở Radial Menu -> Click tùy chọn.
  - Move chuột trên canvas để trigger OSNAP.

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Start Immediately — Foundation & Core Logic):
├── Task 1: Layer State & Default Layers [quick]
├── Task 2: Cập nhật RadialMenu MENU_DATA [quick]
└── Task 3: SnapEngine - Tính toán tọa độ điểm bắt [deep]

Wave 2 (After Wave 1 — State Machine & Canvas Integration):
├── Task 4: Tích hợp OSNAP Renderer vào DrawingWorkspace [visual-engineering]
├── Task 5: Triển khai Modify Engine (Toán học cắt/nối) [ultrabrain]
└── Task 6: Tích hợp Layer Render logic [visual-engineering]

Wave 3 (After Wave 2 — Interaction & Commands):
├── Task 7: Command State Machine cho Modify Tools [deep]
└── Task 8: Liên kết RadialMenu actions với DrawingWorkspace [unspecified-high]

Wave FINAL (After ALL tasks — Independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix
- **Task 1-3**: — (độc lập, làm trước)
- **Task 4**: Cần Task 3
- **Task 5**: Cần Task 1, 2
- **Task 6**: Cần Task 1
- **Task 7**: Cần Task 5
- **Task 8**: Cần Task 4, 7

---

## TODOs

- [ ] 1. Khởi tạo State và Types cho Layer Manager
  **What to do**:
  - Tạo context hoặc thêm state vào `DrawingWorkspace.tsx` để lưu danh sách các Layers (Dùng `CADLayer` trong `types/CADTypes.ts`).
  - Khởi tạo mặc định 3 layers: `0` (trắng), `Defpoints` (xám), `Cut` (đỏ).
  - Đảm bảo khi tạo `cadEntities` mới, gán `layerId` hiện hành.

  **Must NOT do**:
  - Không tạo một Modal/Dialog phức tạp cho Layer, tạm thời chỉ dùng predefined list.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: Bổ sung logic state cơ bản.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `types/CADTypes.ts:CADLayer` - Sử dụng type này.
  - `components/nesting/DrawingWorkspace.tsx` - File thêm state.

  **Acceptance Criteria**:
  - [ ] Kiểm tra code có state `layers` và `currentLayerId`.

  **QA Scenarios**:
  ```text
  Scenario: Check Layer State
    Tool: Playwright
    Preconditions: Khởi động app
    Steps:
      1. Vào màn hình Workspace (vẽ)
    Expected Result: Giao diện render bình thường không crash.
    Evidence: .sisyphus/evidence/task-1-layer-state.png
  ```

- [ ] 2. Cập nhật RadialMenu MENU_DATA
  **What to do**:
  - Mở `components/NestingAX/RadialMenu.tsx`.
  - Kiểm tra `MENU_DATA`. Cập nhật các menu con nếu thiếu (chắc chắn có "Lớp (Layers)", "Chỉnh sửa", "OSNAP").
  - Gán `action` chuỗi string như `osnap_toggle`, `layer_select` để Workspace nhận được.

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `components/NestingAX/RadialMenu.tsx:MENU_DATA`

  **QA Scenarios**:
  ```text
  Scenario: Radial Menu Options
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Click chuột phải (contextmenu) vào canvas.
      2. Chụp màn hình Radial Menu có chứa "Lớp" và "Chỉnh sửa".
    Expected Result: Menu mở ra thành công với các mục mới.
    Evidence: .sisyphus/evidence/task-2-radial-menu.png
  ```

- [ ] 3. Tạo SnapEngine (Toán học Bắt điểm)
  **What to do**:
  - Tạo class `SnapEngine` trong `services/CADEngine.ts` (hoặc riêng).
  - Viết logic nhận vào danh sách `CadEntity[]` và tọa độ chuột `worldPos`.
  - Tìm ra điểm Snap (Endpoint, Midpoint, Center) nằm trong bán kính `hitThreshold`.
  - Trả về tọa độ điểm snap và loại snap (SnapType).

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Cần xử lý toán học khoảng cách, trung điểm, tâm.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `services/nesting/geometry.ts` - Tái sử dụng `distance()`.
  - `types/CADTypes.ts:SnapType`

  **QA Scenarios**:
  ```text
  Scenario: Unit check logic toán học
    Tool: Bash (Node REPL)
    Preconditions: None
    Steps:
      1. Compile `tsc` để check lỗi cú pháp.
    Expected Result: Compile pass.
    Evidence: .sisyphus/evidence/task-3-snap-math.txt
  ```

- [ ] 4. Tích hợp OSNAP Renderer vào DrawingWorkspace
  **What to do**:
  - Trong `DrawingWorkspace.tsx`, thêm logic gọi `SnapEngine` ở sự kiện `handleMouseMove`.
  - Nếu tìm thấy SnapPoint, render icon nhỏ lên Canvas (Canvas 2D: ô vuông màu vàng cho endpoint, tam giác cho midpoint, dấu X cho intersection).
  - Cập nhật hàm `handleDrawingClick` để ưu tiên lấy điểm `SnapPoint` thay vì `worldPos` chuột.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Cần vẽ các hình khối icon trực tiếp trên Canvas 2D.

  **Parallelization**:
  - **Blocked By**: Task 3
  - **Parallel Group**: Wave 2

  **References**:
  - `components/nesting/DrawingWorkspace.tsx:renderDrawingPreview`

  **QA Scenarios**:
  ```text
  Scenario: OSNAP Rendering
    Tool: Playwright
    Preconditions: Canvas có sẵn 1 đoạn thẳng
    Steps:
      1. Chọn công cụ Line (từ phím L)
      2. Di chuyển chuột lại gần điểm đầu của đoạn thẳng cũ
      3. Chụp màn hình (hi vọng thấy icon ô vuông màu vàng)
    Expected Result: OSNAP icon hiển thị.
    Evidence: .sisyphus/evidence/task-4-osnap.png
  ```

- [ ] 5. Triển khai Modify Engine (Toán học Cắt/Nối)
  **What to do**:
  - Viết logic toán học cho: Offset, Trim, Extend (tối thiểu Trim).
  - Tái sử dụng `offsetPolygon` trong `geometry.ts` hoặc tự viết hàm tìm giao điểm để cắt Line.
  - Trim logic: Cho đoạn thẳng A và ranh giới B. Lấy điểm giao -> xóa phần click.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Cắt tỉa không gian là toán học cực kỳ phức tạp.

  **Parallelization**:
  - **Parallel Group**: Wave 2

  **QA Scenarios**:
  ```text
  Scenario: Math logic check
    Tool: Bash (Node REPL)
    Preconditions: None
    Steps:
      1. Chạy REPL test giao điểm và kết quả cắt.
    Expected Result: Output logic đúng.
    Evidence: .sisyphus/evidence/task-5-modify-math.txt
  ```

- [ ] 6. Tích hợp Layer Render logic
  **What to do**:
  - Chỉnh sửa logic vẽ (hàm `stroke()` / `fillStyle`) trong `DrawingWorkspace.tsx` để lấy màu theo thuộc tính `layerId` của `CadEntity` tương chiếu với mảng state `layers`.
  - Default fallbacks nếu không tìm thấy layer.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Blocked By**: Task 1
  - **Parallel Group**: Wave 2

  **QA Scenarios**:
  ```text
  Scenario: Render with Layer Colors
    Tool: Playwright
    Preconditions: Entity có layer 'Cut' (red)
    Steps:
      1. Mở màn hình Workspace.
    Expected Result: Entity hiển thị màu đỏ thay vì màu trắng default.
    Evidence: .sisyphus/evidence/task-6-layer-render.png
  ```

- [ ] 7. Command State Machine cho Modify Tools
  **What to do**:
  - Thêm hệ thống Command Phase (`CommandState` trong `CADTypes.ts`) vào `DrawingWorkspace.tsx`.
  - Ví dụ lệnh Trim:
    - Phase `awaiting_selection`: Yêu cầu chọn vật thể bị cắt.
    - Click chuột -> gọi Modify Engine.
    - Cập nhật mảng `cadEntities`.
  - Xử lý prompt text trên UI (Dòng thông báo: "Chọn đối tượng để cắt...").

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Cần quản lý state React phức tạp (Nhiều steps trong 1 lệnh).

  **Parallelization**:
  - **Blocked By**: Task 5
  - **Parallel Group**: Wave 3

  **QA Scenarios**:
  ```text
  Scenario: Trim Interaction
    Tool: Playwright
    Preconditions: Có 2 đường thẳng giao nhau
    Steps:
      1. Bật lệnh Trim.
      2. Click vào phần dư của đường 1.
    Expected Result: Phần dư bị xóa khỏi Canvas.
    Evidence: .sisyphus/evidence/task-7-trim.png
  ```

- [ ] 8. Liên kết RadialMenu actions với DrawingWorkspace
  **What to do**:
  - Bắt event `onSelectTool` từ `RadialMenu` trong `DrawingWorkspace` (hoặc file cha).
  - Map chuỗi action ("trim", "offset", "layer_panel") thành hàm setState (set active tool, hiển thị thông báo, thay đổi layer).

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Blocked By**: Task 4, 7
  - **Parallel Group**: Wave 3

  **QA Scenarios**:
  ```text
  Scenario: Menu Control Flow
    Tool: Playwright
    Preconditions: App chạy
    Steps:
      1. Click phải chuột -> "Chỉnh sửa" -> "Cắt (Trim)"
      2. Nhìn xem UI Prompt có báo "Chọn đối tượng cần cắt" không.
    Expected Result: Menu kích hoạt đúng state của Command.
    Evidence: .sisyphus/evidence/task-8-menu-link.png
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify implement exists.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit`. Review changes.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `playwright`
  Start from clean state. Thử quy trình: Mở menu vòng -> Chọn công cụ vẽ Line -> Vẽ 2 đường chéo -> Mở menu vòng -> Chọn lệnh Trim -> Click và cắt -> Kiểm tra ảnh.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Check for scope creep.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **1**: `feat(cad): add layer state and snap math`
- **2**: `feat(cad): add canvas integration for layers and snaps`
- **3**: `feat(cad): implement radial menu interaction for modify commands`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit
```

### Final Checklist
- [ ] Bắt điểm (OSNAP) (hiện icon khi chuột lại gần).
- [ ] Dùng Radial Menu để kích hoạt lệnh Trim/Modify.
- [ ] Các entities lưu được layerId và đổi màu theo Layer.