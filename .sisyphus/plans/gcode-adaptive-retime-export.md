# GCode Adaptive Retime Export

## TL;DR

> **Quick Summary**: Tách hẳn luồng export video GCode ra khỏi canvas chính. Export sẽ dùng snapshot dữ liệu GCode đã parse, render nền bằng renderer riêng, áp dụng chiến lược adaptive theo speed, rồi xuất WebM đúng tốc độ user chọn trước khi gửi Discord.
>
> **Deliverables**:
> - Tách pipeline export khỏi live canvas/UI state
> - Chính sách adaptive speed/frame-density (`<= x50` tăng mật độ frame, trần `90fps`)
> - Bộ test tự động với Vitest cho logic tốc độ/timeline/export policy
> - Xác nhận upload Discord vẫn hoạt động với clip sau khi đổi logic export
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Tách export pipeline → Adaptive fps/timestamp policy → Gắn lại vào GCodeViewer → QA + tests

---

## Context

### Original Request
Người dùng muốn làm lại cách tạo clip GCode: render không được trông như live/realtime nữa, canvas chính vẫn dùng bình thường, export phải chạy riêng. Ý tưởng gốc là render nhanh kiểu x100 rồi chỉnh lại tốc độ video về đúng speed đã chọn trước khi gửi Discord.

### Interview Summary
**Key Discussions**:
- Export hiện tại gây cảm giác “dao vẫn chạy live”, rất khó chịu.
- Canvas chính phải tiếp tục dùng bình thường trong lúc export.
- Export phải lấy dữ liệu từ GCode/timeline đã parse, không quay lại canvas live.
- Từ `x50` trở xuống phải tăng mật độ frame, tối đa `90fps`.
- Giữ preview nhỏ đã có sẵn, không thêm UI preview mới.
- Khi bấm export phải snapshot dữ liệu để clip đang xuất không bị đổi giữa chừng.
- Người dùng muốn thêm bộ test tự động.

**Research Findings**:
- `components/GCodeViewer.tsx` đang là entrypoint export hiện tại (`handleVideoExport`).
- `services/offlineRenderer.ts` đang sample timeline và encode WebM theo frame/timestamp.
- `services/WebMEncoder.ts` đã có sẵn WebCodecs + webm-muxer.
- `server.js` chỉ proxy upload Discord, không nên gánh media transform.
- OpenCut có ffmpeg wasm asset, nhưng dấu hiệu hiện có nghiêng về pipeline export/render riêng, không đủ bằng chứng để sao chép một luồng ffmpeg retime hoàn chỉnh từ đó.

### Metis Review
**Identified Gaps** (addressed):
- Thiếu guardrail cho trường hợp user sửa GCode trong lúc export → chốt snapshot policy.
- Thiếu acceptance criteria về việc canvas chính vẫn tương tác được → thêm QA riêng cho việc pan/zoom khi export.
- Thiếu ràng buộc chống scope creep → khóa phạm vi ở WebM/export hiện tại, không mở rộng sang format/UI mới.

---

## Work Objectives

### Core Objective
Thiết kế lại luồng export video GCode để export chạy nền bằng renderer riêng, không dính vào live playback của canvas chính, đồng thời vẫn đảm bảo video cuối cùng phát đúng speed user chọn và mượt hơn ở các mức tốc độ thấp.

### Concrete Deliverables
- Logic snapshot export từ dữ liệu GCode đã parse
- Pipeline export nền tách khỏi canvas chính trong `components/GCodeViewer.tsx`
- Adaptive frame-density policy trong pipeline export
- Vitest config + test files cho logic export policy/timeline math
- Luồng upload Discord giữ nguyên contract hiện tại

### Definition of Done
- [x] Export không làm canvas chính chạy theo clip hoặc bị khóa thao tác
- [x] Speed `<= x50` tăng mật độ frame, không vượt `90fps`
- [x] Clip WebM cuối phát đúng speed user đã chọn
- [x] `npm run test` chạy được với Vitest
- [x] Upload `/api/discord-video` vẫn thành công với clip xuất mới

### Must Have
- Export dùng snapshot dữ liệu ngay lúc bấm nút
- Canvas chính tiếp tục dùng bình thường trong lúc export
- Không set React state theo từng frame trong vòng render offline
- Dùng preview nhỏ có sẵn, không tạo preview UI mới
- Có test tự động cho policy speed/fps/timestamp

### Must NOT Have (Guardrails)
- Không được quay/record canvas chính để làm video
- Không được thêm xử lý media transform vào `server.js`
- Không được biến export thành live playback trá hình
- Không được mở rộng sang MP4 hay format mới trong plan này
- Không được đại tu toàn bộ `GCodeViewer.tsx`; chỉ tách phần export cần thiết

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — tất cả verification phải do agent/chạy lệnh thực hiện.

### Test Decision
- **Infrastructure exists**: PARTIAL (đã có Playwright trong `devDependencies`, chưa có test runner unit)
- **Automated tests**: YES (tests-after)
- **Framework**: Vitest

### QA Policy
Mỗi task phải có QA scenario chạy thật. Evidence lưu trong `.sisyphus/evidence/`.

- **Frontend/UI**: Playwright hoặc browser automation để xác nhận canvas chính vẫn dùng bình thường trong lúc export.
- **Logic/Module**: Vitest cho adaptive fps, timestamp scaling, snapshot policy helper.
- **API/Backend**: `curl` hoặc fetch-based verification cho `/api/discord-video` contract.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — nền tảng + tách ranh giới):
├── Task 1: Thiết lập Vitest + test scripts [quick]
├── Task 2: Tách snapshot export contract khỏi GCodeViewer [deep]
├── Task 3: Thiết kế export config/policy module cho speed→fps/timestamp [deep]
├── Task 4: Rà soát contract upload Discord và export payload [quick]
└── Task 4.5: Chuẩn hóa nguồn dữ liệu export từ GCode parse [deep]

Wave 2 (After Wave 1 — core export pipeline):
├── Task 5: Refactor offlineRenderer sang pipeline export nền độc lập [deep]
├── Task 6: Cài adaptive frame density với ngưỡng x50 / max 90fps [deep]
├── Task 7: Cài retime/timestamp strategy cho WebM output [deep]
└── Task 8: Bảo vệ main canvas khỏi coupling/re-render khi export [unspecified-high]

Wave 3 (After Wave 2 — integration + testing):
├── Task 9: Gắn pipeline mới vào GCodeViewer bằng preview nhỏ hiện có [unspecified-high]
├── Task 10: Viết Vitest cho policy/timeline/snapshot helpers [quick]
├── Task 11: Viết verification cho Discord upload contract [quick]
└── Task 12: Browser QA cho main-canvas interactive + export nền [unspecified-high]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality + build/test review (unspecified-high)
├── Task F3: Real QA replay of export flow (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: 4.5 → 5 → 6 → 7 → 9 → 12
Parallel Speedup: ~58% faster than sequential
Max Concurrent: 5
```

### Dependency Matrix

- **1**: — → 10
- **2**: — → 5, 8, 9
- **3**: — → 6, 7, 10
- **4**: — → 11
- **4.5**: — → 5, 9, 10
- **5**: 2, 4.5 → 6, 7, 8, 9
- **6**: 3, 5 → 9, 10, 12
- **7**: 3, 5 → 9, 10, 11, 12
- **8**: 2, 5 → 9, 12
- **9**: 2, 4.5, 5, 6, 7, 8 → 12
- **10**: 1, 3, 4.5, 6, 7 → FINAL
- **11**: 4, 7 → FINAL
- **12**: 6, 7, 8, 9 → FINAL

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1 `quick`, T2 `deep`, T3 `deep`, T4 `quick`, T4.5 `deep`
- **Wave 2**: 4 tasks — T5 `deep`, T6 `deep`, T7 `deep`, T8 `unspecified-high`
- **Wave 3**: 4 tasks — T9 `unspecified-high`, T10 `quick`, T11 `quick`, T12 `unspecified-high`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

> Implementation + verification = ONE task.

- [x] 1. Thiết lập Vitest cho project Vite hiện tại

  **What to do**:
  - Thêm `vitest` (và nếu cần `jsdom`) vào `devDependencies`.
  - Tạo `vitest.config.ts` tương thích với alias `@` trong `vite.config.ts`.
  - Thêm script `test` vào `package.json`.
  - Tạo 1 test smoke nhỏ để xác nhận runner hoạt động.

  **Must NOT do**:
  - Không kéo thêm framework E2E mới.
  - Không thay đổi cấu hình build production ngoài phần test.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: setup công cụ nhỏ, phạm vi hẹp.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: không cần cho setup test runner unit.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: 10
  - **Blocked By**: None

  **References**:
  - `package.json` - nơi thêm script test và devDependency.
  - `vite.config.ts` - cần mirror alias/config cho Vitest.
  - `AGENTS.md` - xác nhận dự án hiện chưa có test framework và khuyến nghị Vitest.

  **Acceptance Criteria**:
  - [x] `package.json` có script `test`
  - [x] `vitest.config.ts` tồn tại và đọc được alias `@`
  - [x] `npm run test` chạy thành công ít nhất 1 test smoke

  **QA Scenarios**:
  ```
  Scenario: Vitest runner khởi động được
    Tool: Bash
    Preconditions: dependencies đã được cài xong
    Steps:
      1. Chạy `npm run test`
      2. Quan sát output test summary
      3. Xác nhận có ít nhất 1 test PASS và process exit code = 0
    Expected Result: test runner hoạt động, không báo config error
    Failure Indicators: thiếu script, alias lỗi, Vitest không boot được
    Evidence: .sisyphus/evidence/task-1-vitest-run.txt

  Scenario: Alias @ hoạt động trong test
    Tool: Bash
    Preconditions: có test import module bằng alias
    Steps:
      1. Chạy `npm run test`
      2. Kiểm tra test có import module bằng `@/...`
      3. Xác nhận không có lỗi resolve path
    Expected Result: alias resolve đúng
    Evidence: .sisyphus/evidence/task-1-vitest-alias.txt
  ```

  **Commit**: NO

- [x] 2. Tách snapshot export state khỏi live GCodeViewer state

  **What to do**:
  - Xác định và trích xuất dữ liệu tối thiểu cần cho export: commands đã parse, speed, camera/preview info, theme/view options liên quan.
  - Tạo snapshot object ngay lúc user bấm export.
  - Đảm bảo export đọc từ snapshot đó thay vì state đang thay đổi liên tục của component.

  **Must NOT do**:
  - Không để export pipeline đọc trực tiếp state đang live trong từng frame.
  - Không khóa canvas chính hay editor để giữ snapshot.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: cần bóc tách ranh giới dữ liệu trong component lớn.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: 5, 8, 9
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1125` - `handleVideoExport` hiện tại.
  - `components/GCodeViewer.tsx:1268-1274` - `captureState` snapshot hiện có nhưng chưa đủ tách biệt.
  - `services/offlineRenderer.ts:24-30` - contract `captureState` / `restoreState`.

  **Acceptance Criteria**:
  - [x] Export dùng snapshot cố định được tạo ngay lúc bấm nút
  - [x] Nếu user tiếp tục sửa GCode sau đó, clip đang export không bị đổi nội dung
  - [x] Canvas chính vẫn phản ứng theo thao tác user, không làm hỏng snapshot export

  **QA Scenarios**:
  ```
  Scenario: Snapshot giữ nguyên clip dù user sửa GCode sau khi export bắt đầu
    Tool: Playwright
    Preconditions: đã nạp file GCode hợp lệ, export button khả dụng
    Steps:
      1. Nhấn nút export video
      2. Ngay sau khi export bắt đầu, sửa nội dung editor GCode hoặc nạp một thay đổi nhỏ
      3. Chờ export hoàn tất
      4. Kiểm tra metadata/evidence của clip export khớp với nội dung trước khi sửa
    Expected Result: clip đang xuất không đổi giữa chừng
    Failure Indicators: clip phản ánh dữ liệu mới sau khi export đã chạy
    Evidence: .sisyphus/evidence/task-2-snapshot-stability.txt

  Scenario: Canvas chính vẫn thao tác được sau khi snapshot được tạo
    Tool: Playwright
    Preconditions: export đang chạy
    Steps:
      1. Drag canvas chính để rotate/pan
      2. Zoom bằng wheel hoặc control tương ứng
      3. Xác nhận export không bị hủy/lỗi
    Expected Result: thao tác canvas chính thành công, export vẫn tiếp tục
    Evidence: .sisyphus/evidence/task-2-main-canvas-interactive.txt
  ```

  **Commit**: NO

- [x] 3. Thiết kế policy module cho speed, fps và retime strategy

  **What to do**:
  - Trích xuất logic quyết định speed export thành module/pure functions riêng.
  - Mô hình hóa rule:
    - speed `> x50` → ưu tiên fast export path
    - speed `<= x50` → tăng frame density
    - fps trần `90`
  - Quy định rõ input/output của policy để test được độc lập.

  **Must NOT do**:
  - Không nhét toàn bộ công thức vào `GCodeViewer.tsx`.
  - Không hardcode lẫn lộn giữa speed slider UI và export speed policy.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: đây là lõi logic quyết định chất lượng/thời gian export.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: 6, 7, 10
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1438` - mapping slider → `playbackSpeed` hiện tại.
  - `services/gcodeTimelineSampler.ts` - nơi đang giữ `fps` và `initialSpeed`.
  - Draft requirements trong `.sisyphus/drafts/new-idea.md` - rule người dùng chốt.

  **Acceptance Criteria**:
  - [x] Có module/pure function trả ra export fps + capture strategy từ speed user chọn
  - [x] Rule `<= x50` và cap `90fps` được encode rõ ràng
  - [x] Logic này có thể unit test độc lập không cần render UI

  **QA Scenarios**:
  ```
  Scenario: Policy trả đúng nhánh fast path cho speed cao
    Tool: Bash
    Preconditions: có unit test hoặc script kiểm tra pure function
    Steps:
      1. Chạy test case với speed x100
      2. Quan sát output policy
      3. Xác nhận fps không vượt cap và strategy = fast path
    Expected Result: speed cao không kích hoạt density boost thấp-speed
    Evidence: .sisyphus/evidence/task-3-policy-fast.txt

  Scenario: Policy trả đúng nhánh density boost cho speed thấp
    Tool: Bash
    Preconditions: same as above
    Steps:
      1. Chạy test case với speed x25 và x1
      2. Kiểm tra fps tăng lên nhưng không vượt 90
      3. Kiểm tra strategy đánh dấu low-speed quality branch
    Expected Result: speed thấp kích hoạt density boost
    Evidence: .sisyphus/evidence/task-3-policy-low.txt
  ```

  **Commit**: NO

- [x] 4. Khóa contract upload Discord và payload video hiện tại

  **What to do**:
  - Xác nhận export redesign không đổi API upload `/api/discord-video`.
  - Ghi rõ tên file, mime type, payload JSON và giới hạn size cần tuân theo.
  - Chuẩn bị verification cho trường hợp video sau đổi logic vẫn upload được.

  **Must NOT do**:
  - Không thêm transcoding vào `server.js`.
  - Không đổi endpoint hay format gửi Discord trong plan này.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: phạm vi hợp đồng API nhỏ, rõ ràng.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: 11
  - **Blocked By**: None

  **References**:
  - `server.js:120-157` - endpoint `/api/discord-video` và limit `7.5MB`.
  - `components/GCodeViewer.tsx:1327-1349` - payload_json + file upload hiện tại.

  **Acceptance Criteria**:
  - [x] Endpoint upload giữ nguyên contract
  - [x] Export redesign không yêu cầu backend transform mới
  - [x] Verification có thể chứng minh clip mới vẫn upload được

  **QA Scenarios**:
  ```
  Scenario: Payload upload vẫn đúng contract cũ
    Tool: Bash
    Preconditions: có clip export mẫu nhỏ
    Steps:
      1. Gửi POST multipart tới `/api/discord-video`
      2. Đính kèm `payload_json` và file webm
      3. Kiểm tra response JSON
    Expected Result: response `{ ok: true }` hoặc thông báo thành công tương đương
    Failure Indicators: 4xx do sai field/file/type
    Evidence: .sisyphus/evidence/task-4-discord-contract.txt

  Scenario: Video quá lớn bị chặn đúng cách
    Tool: Bash
    Preconditions: có file vượt limit hoặc mô phỏng file lớn
    Steps:
      1. Gửi file vượt 7.5MB tới endpoint
      2. Kiểm tra mã phản hồi
    Expected Result: trả lỗi 413 với thông điệp giới hạn kích thước
    Evidence: .sisyphus/evidence/task-4-discord-size-limit.txt
  ```

  **Commit**: NO

- [x] 4.5. Chuẩn hóa nguồn dữ liệu export từ GCode parse sang export snapshot

  **What to do**:
  - Chốt rõ luồng dữ liệu: file GCode/raw text -> parse -> commands/timeline data -> snapshot export -> renderer export.
  - Nếu hiện tại parse logic còn bị rải trong component, xác định helper/module hóa phần dữ liệu chung để live preview và export cùng dùng một nguồn đã parse.
  - Bảo đảm export không “đọc hình” từ canvas chính mà chỉ đọc dữ liệu mô phỏng đã parse.

  **Must NOT do**:
  - Không để export dùng trực tiếp DOM/canvas pixels của view chính.
  - Không tách ra hai parser khác nhau gây lệch kết quả giữa live và export.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: đây là điểm user còn lăn tăn nhất về mặt hiểu luồng dữ liệu.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: 5, 9, 10
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1561-1585` - nơi file được xử lý thành `commands`/`analysis`.
  - `services/gcodeService.ts` - parser/service nguồn cho GCode.
  - `services/gcodeTimelineSampler.ts` - lớp dữ liệu timeline mà export tiêu thụ.

  **Acceptance Criteria**:
  - [x] Luồng dữ liệu export được tách rõ: parse một lần, snapshot một lần, render từ snapshot
  - [x] Live preview và export dùng cùng nguồn commands đã parse, không có parser thứ hai lệch logic
  - [x] Có bằng chứng rõ rằng export không phụ thuộc pixel/frame từ canvas chính

  **QA Scenarios**:
  ```
  Scenario: Export dùng dữ liệu parse chung chứ không quay canvas chính
    Tool: Bash
    Preconditions: có logging hoặc helper inspection trong code
    Steps:
      1. Kích hoạt export trên GCode đã parse sẵn
      2. Xác nhận pipeline export nhận commands/timeline snapshot, không đọc canvas pixels
      3. Lưu log hoặc output kiểm tra
    Expected Result: dữ liệu export đi từ parse/timeline snapshot
    Evidence: .sisyphus/evidence/task-4-5-data-flow.txt

  Scenario: Live preview và export khớp cùng nguồn commands
    Tool: Playwright
    Preconditions: đã load GCode mẫu
    Steps:
      1. Chọn một vị trí/lệnh đặc trưng trong live preview
      2. Bắt đầu export từ cùng dữ liệu hiện tại
      3. Kiểm tra metadata/log export phản ánh cùng bộ commands đã parse
    Expected Result: không có lệch nguồn dữ liệu giữa live và export
    Evidence: .sisyphus/evidence/task-4-5-shared-commands.txt
  ```

  **Commit**: NO

---

- [x] 5. Refactor offlineRenderer thành pipeline export nền độc lập

  **What to do**:
  - Tách phần export loop để không dựa vào canvas/live UI state.
  - Cho pipeline chạy bằng surface render riêng (offscreen hoặc canvas export riêng), độc lập với canvas chính.
  - Giữ cơ chế yield/backpressure để tránh nghẽn main thread.

  **Must NOT do**:
  - Không render từng frame bằng cách set state React của canvas chính.
  - Không làm export loop chiếm toàn bộ main thread không yield.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: thay đổi lõi pipeline export.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 sequential dependency start
  - **Blocks**: 6, 7, 8, 9
  - **Blocked By**: 2

  **References**:
  - `services/offlineRenderer.ts:42-149` - vòng export hiện tại.
  - `services/WebMEncoder.ts:91-146` - frame add/finish lifecycle.
  - `components/GCodeViewer.tsx:1275-1315` - frame apply/render hiện tại cần decouple.

  **Acceptance Criteria**:
  - [x] Pipeline export có surface render riêng
  - [x] Không cần mutate live canvas để lấy clip
  - [x] Main canvas vẫn responsive trong lúc export chạy

  **QA Scenarios**:
  ```
  Scenario: Export pipeline chạy mà không kéo canvas chính chạy theo
    Tool: Playwright
    Preconditions: đã load GCode và vào view 3D
    Steps:
      1. Bắt đầu export
      2. Quan sát canvas chính trong 10 giây
      3. Kiểm tra rằng không có chuyển động export cưỡng ép trên canvas chính
    Expected Result: canvas chính không bị “live render” theo clip export
    Evidence: .sisyphus/evidence/task-5-no-live-canvas.png

  Scenario: Export loop vẫn tiến triển khi canvas chính được tương tác
    Tool: Playwright
    Preconditions: export đang chạy
    Steps:
      1. Rotate/pan canvas chính liên tục vài lần
      2. Theo dõi progress export
      3. Xác nhận progress vẫn tăng và export không fail
    Expected Result: export độc lập với thao tác live
    Evidence: .sisyphus/evidence/task-5-progress-under-interaction.txt
  ```

  **Commit**: NO

- [x] 6. Áp adaptive frame density cho speed thấp với trần 90fps

  **What to do**:
  - Cập nhật timeline/export policy để speed `<= x50` tăng fps hoặc mật độ lấy mẫu.
  - Bảo đảm giới hạn tối đa `90fps`.
  - Tối ưu để speed cao không bị gánh chi phí density boost không cần thiết.

  **Must NOT do**:
  - Không để speed thấp vẫn bị cố định ở mật độ frame của x100 nhanh.
  - Không vượt 90fps.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: ảnh hưởng trực tiếp tới độ mượt và thời gian export.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8 after Task 5)
  - **Blocks**: 9, 10, 12
  - **Blocked By**: 3, 5

  **References**:
  - `services/gcodeTimelineSampler.ts:41-98` - sampling hiện tại.
  - `services/WebMEncoder.ts:16-27` - default frameRate config.
  - Draft requirement line about `x50` threshold / `90fps` cap.

  **Acceptance Criteria**:
  - [x] Speed x1/x25/x50 đều kích hoạt density boost
  - [x] Không case nào vượt 90fps
  - [x] Speed > x50 không bị bắt buộc density boost low-speed branch

  **QA Scenarios**:
  ```
  Scenario: Speed x25 tăng mật độ frame đúng nhánh
    Tool: Bash
    Preconditions: có logging/evidence cho config export thực tế
    Steps:
      1. Chạy export hoặc test config với speed x25
      2. Ghi lại fps export được chọn
      3. Xác nhận fps > default low-density path và <= 90
    Expected Result: nhánh low-speed được kích hoạt
    Evidence: .sisyphus/evidence/task-6-speed-x25.txt

  Scenario: Speed x100 không bị ép branch 90fps
    Tool: Bash
    Preconditions: same
    Steps:
      1. Chạy export config với speed x100
      2. Kiểm tra fps/config path
    Expected Result: speed cao dùng nhánh nhanh hơn
    Evidence: .sisyphus/evidence/task-6-speed-x100.txt
  ```

  **Commit**: NO

- [x] 7. Cài retime/timestamp strategy để clip cuối phát đúng speed user chọn

  **What to do**:
  - Quyết định và cài chiến lược timestamp đầu ra để video cuối phản ánh đúng speed user chọn.
  - Nếu dùng post-render retime nội bộ, phải giữ pipeline trong client-side, không đẩy sang backend.
  - Bảo đảm timestamp monotonic, duration cuối chính xác, không gây lỗi muxer/player.

  **Must NOT do**:
  - Không phụ thuộc backend hoặc ffmpeg server-side.
  - Không tạo clip duration sai so với speed user chọn.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: đây là lõi correctness của video final.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8 after Task 5)
  - **Blocks**: 9, 10, 11, 12
  - **Blocked By**: 3, 5

  **References**:
  - `services/offlineRenderer.ts:97` - timestamp micros đang được đẩy vào encoder.
  - `services/WebMEncoder.ts:98-105` - `VideoFrame` timestamp encode.
  - `services/gcodeTimelineSampler.ts:156` - `time` trên timeline frame.

  **Acceptance Criteria**:
  - [x] Clip final phát đúng speed đã chọn
  - [x] Duration tính nhất quán giữa preview/export metadata
  - [x] Không có timestamp regress hoặc finalize lỗi

  **QA Scenarios**:
  ```
  Scenario: Clip x25 có duration đúng theo speed target
    Tool: Bash
    Preconditions: có clip export thành công và công cụ đọc metadata duration
    Steps:
      1. Export clip với speed x25
      2. Đọc metadata duration của file webm
      3. So sánh với duration mong đợi từ timeline + speed
    Expected Result: duration nằm trong sai số chấp nhận được
    Evidence: .sisyphus/evidence/task-7-duration-x25.txt

  Scenario: Timestamp monotonic, muxer finalize thành công
    Tool: Bash
    Preconditions: logging encoder/muxer sẵn sàng
    Steps:
      1. Chạy export
      2. Kiểm tra không có lỗi finalize/timestamp invalid
    Expected Result: encoder/muxer hoàn tất sạch
    Evidence: .sisyphus/evidence/task-7-timestamp-clean.txt
  ```

  **Commit**: NO

- [x] 8. Chặn coupling giữa export loop và React/main canvas behavior

  **What to do**:
  - Xóa/hạn chế mọi update React state theo từng frame export.
  - Đảm bảo export progress chỉ cập nhật ở mức coarse-grained, không ép re-render nặng.
  - Giữ canvas chính độc lập với export state machine.

  **Must NOT do**:
  - Không gọi `setDisplayPos`, `setCurrentIndex` kiểu per-frame trong export loop.
  - Không để export progress làm lag UI.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: liên quan React state trong component lớn, dễ regression.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7 after Task 5)
  - **Blocks**: 9, 12
  - **Blocked By**: 2, 5

  **References**:
  - `components/GCodeViewer.tsx:1285-1288` - comment hiện tại về việc không set state mỗi frame.
  - `components/GCodeViewer.tsx:1256-1267` - progress/export state entrypoint.
  - Metis note: main thread must stay responsive.

  **Acceptance Criteria**:
  - [x] Không có React state update per-frame trong export loop
  - [x] Progress vẫn hiển thị được nhưng không gây “realtime look”
  - [x] Canvas chính không bị giật rõ khi export chạy

  **QA Scenarios**:
  ```
  Scenario: Export progress cập nhật nhưng UI không bị lù đù realtime
    Tool: Playwright
    Preconditions: export đang chạy
    Steps:
      1. Quan sát progress/status và canvas chính trong lúc export
      2. Xác nhận không có chuyển động dao export bám UI chính
    Expected Result: có trạng thái export nhưng không có cảm giác live playback
    Evidence: .sisyphus/evidence/task-8-ui-decoupled.png

  Scenario: Main UI vẫn phản hồi thao tác cơ bản
    Tool: Playwright
    Preconditions: export đang chạy
    Steps:
      1. Click các control không phá snapshot (ví dụ xoay/zoom/view controls)
      2. Xác nhận UI phản hồi và export không crash
    Expected Result: UI responsive, export ổn định
    Evidence: .sisyphus/evidence/task-8-ui-responsive.txt
  ```

  **Commit**: NO

---

- [x] 9. Gắn pipeline export mới vào GCodeViewer bằng preview nhỏ hiện có

  **What to do**:
  - Thay thế luồng `handleVideoExport` để dùng snapshot + pipeline export mới.
  - Tận dụng khung preview nhỏ/camera đã có sẵn cho export context.
  - Không thêm UI mới; chỉ chỉnh logic wiring cần thiết.

  **Must NOT do**:
  - Không làm canvas chính biến thành preview export.
  - Không nhân đôi UI control không cần thiết.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cần chạm component lớn và wiring nhiều state.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 sequential start
  - **Blocks**: 12
  - **Blocked By**: 2, 5, 6, 7, 8

  **References**:
  - `components/GCodeViewer.tsx:1125-1380` - toàn bộ `handleVideoExport` hiện tại.
  - `components/GCodeViewer.tsx:1941-1947` - khu vực preview export/live preview hiện tại.
  - `components/GCodeViewer.tsx:901-907` - `UpdateMiniCamera` / `miniCameraRef` usage.

  **Acceptance Criteria**:
  - [x] Nút export dùng pipeline mới
  - [x] Preview nhỏ hiện có vẫn được tận dụng, không thêm preview mới
  - [x] Canvas chính vẫn là canvas người dùng, không bị chiếm bởi export

  **QA Scenarios**:
  ```
  Scenario: Bấm export dùng preview nhỏ hiện có, không tạo UI mới
    Tool: Playwright
    Preconditions: app mở tới màn hình GCodeViewer
    Steps:
      1. Ghi lại DOM/UI trước khi export
      2. Bấm export
      3. Kiểm tra chỉ dùng khung preview hiện hữu, không xuất hiện panel preview mới
    Expected Result: không có UI preview thừa
    Evidence: .sisyphus/evidence/task-9-preview-existing-only.png

  Scenario: Canvas chính vẫn phục vụ thao tác người dùng trong lúc export
    Tool: Playwright
    Preconditions: export đang chạy
    Steps:
      1. Thao tác rotate/zoom trên canvas chính
      2. Xác nhận thao tác diễn ra trên canvas chính
      3. Xác nhận export không bị đổi góc clip giữa chừng nếu snapshot đã chốt camera export
    Expected Result: main canvas và export tách biệt
    Evidence: .sisyphus/evidence/task-9-main-vs-export-separation.txt
  ```

  **Commit**: NO

- [x] 10. Viết Vitest cho policy adaptive, timestamp math và snapshot helpers

  **What to do**:
  - Viết test cho rule `<= x50` tăng density.
  - Viết test cap `90fps`.
  - Viết test timestamp/duration mapping.
  - Viết test cho snapshot helper để đảm bảo dữ liệu bị đóng băng đúng lúc export.

  **Must NOT do**:
  - Không viết test UI nặng ở đây.
  - Không phụ thuộc browser full render để kiểm tra pure logic.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: chủ yếu test pure logic / helper modules.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12 after dependencies)
  - **Blocks**: FINAL
  - **Blocked By**: 1, 3, 6, 7

  **References**:
  - Policy module từ Task 3
  - `services/gcodeTimelineSampler.ts`
  - `services/offlineRenderer.ts`

  **Acceptance Criteria**:
  - [x] Có test cho speed x1, x25, x50, x51, x100
  - [x] Có test cap 90fps
  - [x] Có test duration/timestamp mapping
  - [x] Có test snapshot immutability logic

  **QA Scenarios**:
  ```
  Scenario: Edge speeds đều pass unit test
    Tool: Bash
    Preconditions: Vitest đã setup
    Steps:
      1. Chạy `npm run test`
      2. Kiểm tra suite adaptive/timestamp/snapshot
      3. Xác nhận các case x1, x25, x50, x51, x100 đều PASS
    Expected Result: logic lõi được khóa bằng test
    Evidence: .sisyphus/evidence/task-10-vitest-edge-speeds.txt

  Scenario: Cap 90fps không bị phá
    Tool: Bash
    Preconditions: same
    Steps:
      1. Chạy test cap fps
      2. Kiểm tra assertion không có output > 90
    Expected Result: cap 90fps được bảo vệ bởi test
    Evidence: .sisyphus/evidence/task-10-fps-cap.txt
  ```

  **Commit**: NO

- [x] 11. Xác minh clip export mới vẫn upload Discord đúng contract

  **What to do**:
  - Kiểm tra file WebM sau thay đổi vẫn tương thích với endpoint upload hiện tại.
  - Kiểm tra payload_json + file upload không đổi format.
  - Nếu có metadata duration/fps cần ghi log, thêm evidence tương ứng.

  **Must NOT do**:
  - Không thay contract API nếu không có blocker thực sự.
  - Không bỏ qua case file size/Discord rejection.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: verification contract + API behavior.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12 after dependencies)
  - **Blocks**: FINAL
  - **Blocked By**: 4, 7

  **References**:
  - `server.js:127-148` - formData upload logic.
  - `components/GCodeViewer.tsx:1342-1349` - current frontend upload call.

  **Acceptance Criteria**:
  - [x] WebM mới upload được qua `/api/discord-video`
  - [x] Payload JSON vẫn gửi kèm đúng
  - [x] Failure mode size limit/error response vẫn rõ ràng

  **QA Scenarios**:
  ```
  Scenario: Clip retime mới upload được lên Discord proxy
    Tool: Bash
    Preconditions: có clip export mới kích thước hợp lệ
    Steps:
      1. Gửi multipart request tới `/api/discord-video`
      2. Kèm clip webm mới và payload_json
      3. Xác nhận response thành công
    Expected Result: upload OK
    Evidence: .sisyphus/evidence/task-11-upload-ok.txt

  Scenario: Error path vẫn rõ khi upload bị từ chối
    Tool: Bash
    Preconditions: mô phỏng lỗi server hoặc file quá lớn
    Steps:
      1. Gửi request lỗi có chủ đích
      2. Kiểm tra message lỗi trả về
    Expected Result: error path dễ hiểu, không silent fail
    Evidence: .sisyphus/evidence/task-11-upload-error.txt
  ```

  **Commit**: NO

- [x] 12. QA browser end-to-end cho export nền, main canvas và preview nhỏ

  **What to do**:
  - Chạy luồng thật từ load GCode → chọn speed → export → tương tác canvas chính → hoàn tất clip.
  - Xác minh preview nhỏ vẫn đúng vai trò, canvas chính vẫn dùng bình thường.
  - Kiểm tra ít nhất 1 speed cao và 1 speed thấp (`<= x50`).

  **Must NOT do**:
  - Không test chỉ một speed duy nhất.
  - Không đánh dấu xong nếu chưa xác minh canvas chính vẫn usable.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cần browser QA đa bước, dễ phát hiện regression integration.
  - **Skills**: [`playwright`]
    - `playwright`: cần cho browser automation và evidence UI.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11 after dependencies)
  - **Blocks**: FINAL
  - **Blocked By**: 6, 7, 8, 9

  **References**:
  - `components/GCodeViewer.tsx` UI controls export/speed/canvas
  - Existing preview nhỏ area around export controls

  **Acceptance Criteria**:
  - [x] Speed cao export xong mà canvas chính vẫn usable
  - [x] Speed thấp (`<= x50`) dùng density boost branch
  - [x] Không có cảm giác canvas chính bị hijack để render clip

  **QA Scenarios**:
  ```
  Scenario: Speed cao export nền không ảnh hưởng canvas chính
    Tool: Playwright
    Preconditions: app mở, đã load GCode mẫu
    Steps:
      1. Đặt speed > x50 (ví dụ x80)
      2. Bắt đầu export
      3. Trong lúc export, rotate và zoom canvas chính
      4. Chờ export xong
    Expected Result: canvas chính vẫn thao tác được, export hoàn tất
    Evidence: .sisyphus/evidence/task-12-high-speed-ui.mp4

  Scenario: Speed thấp kích hoạt density boost và vẫn export đúng
    Tool: Playwright
    Preconditions: same
    Steps:
      1. Đặt speed <= x50 (ví dụ x25)
      2. Bắt đầu export
      3. Xác nhận preview nhỏ/tiến trình vẫn chạy, canvas chính không bị chiếm
      4. Hoàn tất export và ghi nhận metadata/evidence
    Expected Result: nhánh speed thấp hoạt động, canvas chính vẫn bình thường
    Evidence: .sisyphus/evidence/task-12-low-speed-ui.mp4

  Scenario: Dao trượt mượt trên quỹ đạo, không nhảy cóc
    Tool: Playwright/Manual QA
    Preconditions: load GCode có đường cắt dài và arc
    Steps:
      1. Export một đoạn video
      2. Mở video xem kỹ các đoạn cắt G1, G2, G3
    Expected Result: Dao di chuyển liên tục, nối tiếp nhau giữa các điểm (nội suy)
    Failure Indicators: Dao nhảy bụp từ điểm này sang điểm kia
    Evidence: .sisyphus/evidence/task-12-smooth-motion.mp4
  ```

  **Commit**: NO

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Kiểm tra tất cả Must Have / Must NOT Have so với triển khai thực tế. Đặc biệt xác minh export không quay canvas chính, snapshot được dùng, rule `<= x50`/`90fps` có tồn tại.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Chạy build + test, rà code export mới, tìm coupling React state per-frame, log rác, import thừa, và sai lệch scope.

- [x] F3. **Real Manual QA** — `unspecified-high`
  Thực thi toàn bộ kịch bản export tốc độ cao/thấp, tương tác canvas chính trong lúc export, upload Discord, lưu evidence.

- [x] F4. **Scope Fidelity Check** — `deep`
  Đối chiếu diff thực tế với plan: không thêm UI preview mới, không thêm backend transcoding, không mở rộng sang format ngoài WebM.

---

## Commit Strategy

- Setup tooling: `test(vitest): add unit test runner for export logic`
- Export policy core: `feat(gcode-export): add adaptive fps and snapshot export policy`
- Integration: `refactor(gcode-viewer): decouple export pipeline from live canvas`
- Verification: `test(gcode-export): cover adaptive retime and upload flow`

---

## Success Criteria

### Verification Commands
```bash
npm run test        # Expected: Vitest passes
npm run build       # Expected: Production build succeeds
```

### Final Checklist
- [x] Export chạy bằng pipeline riêng, không hijack canvas chính
- [x] Speed `<= x50` tăng mật độ frame nhưng không vượt `90fps`
- [x] Video final phát đúng speed user chọn
- [x] Preview nhỏ hiện có vẫn được dùng, không thêm UI preview mới
- [x] Snapshot bảo vệ clip đang export khỏi thay đổi GCode giữa chừng
- [x] Upload Discord vẫn thành công với clip xuất mới
