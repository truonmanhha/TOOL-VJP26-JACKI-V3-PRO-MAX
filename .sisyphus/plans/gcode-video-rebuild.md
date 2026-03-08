# GCode Video Rebuild — Render Nhanh, Chạy Mượt Như Realtime, Gửi Discord Tự Động

## TL;DR

> **Quick Summary**: Làm lại hoàn toàn tính năng tạo video từ GCode theo hướng **offline deterministic render**: hình ảnh chuyển động phải giống realtime (đi mượt theo line), nhưng thời gian tạo video phải nhanh hơn realtime đáng kể.
>
> **Deliverables**:
> - Pipeline render video WebM 60 FPS, mặc định 720p
> - Dùng đúng tốc độ hiện có trong app (`speedSliderVal` -> `playbackSpeed`)
> - Giữ hiển thị G0 như bình thường, giữ G4 đúng thời gian
> - Client render xong upload qua backend proxy, backend forward sang Discord
> - Không local download, không retry Discord
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves + final verification wave
> **Critical Path**: T1 -> T4 -> T8 -> T11 -> T13 -> F1/F3

---

## Context

### Original Request
Người dùng muốn video mô phỏng GCode:
- Nhìn như đang chạy realtime thật (không nhảy điểm)
- Không cần ngồi chờ realtime
- Tự gửi Discord sau khi render xong
- Nói tiếng Việt, mô tả đơn giản, dễ hiểu

### Interview Summary
**Key Discussions**:
- Render chạy trên máy user (client-side), không dùng server render
- Chỉ cần WebM, không cần MP4
- Không cần tải local
- Không cần retry upload Discord
- FPS cố định 60, độ phân giải mặc định 720p
- G0 hiển thị như bình thường, G4 giữ đúng thời gian

**Research Findings**:
- Nguồn timing realtime hiện tại nằm ở `components/GCodeViewer.tsx` (khối `simState` + `requestAnimationFrame`)
- Nguồn tốc độ playback chuẩn nằm ở `speedSliderVal -> playbackSpeed`
- Parser feed (`F`) đã có sẵn ở `services/gcodeService.ts`
- Lịch sử code cũ cho thấy các lỗi từng gặp: nhảy điểm, drift timing, và bị chậm do cách capture realtime

### Metis Review
**Identified Gaps** (addressed):
- Bổ sung ràng buộc dung lượng video gửi Discord
- Chốt rõ “không dùng MediaRecorder realtime capture”
- Chốt rõ “timeline cố định 1/60” để motion nhất quán
- Chốt rõ restore trạng thái viewer sau khi render xong/fail

---

## Work Objectives

### Core Objective
Xây lại pipeline video để vừa đạt **đúng chuyển động như realtime**, vừa đạt **thời gian render nhanh** và tự động gửi Discord.

### Concrete Deliverables
- Module dựng timeline/frame theo deterministic fixed-step
- Module encode WebM với kiểm soát queue
- API proxy upload video từ client sang Discord
- UI trạng thái render/upload đơn giản, rõ ràng
- QA evidence đầy đủ cho cả thành công và lỗi

### Definition of Done
- [ ] Tạo video WebM 60 FPS 720p từ GCode và gửi thành công qua `/api/discord`
- [ ] Motion trong video chạy mượt theo line, không teleport
- [ ] Tốc độ render nhanh hơn playback realtime của cùng nội dung
- [ ] App không treo và không phá trạng thái viewer sau render

### Must Have
- Dùng đúng `playbackSpeed` hiện có
- G0 visible như viewer mặc định
- G4 dwell giữ đúng thời gian
- Upload qua backend proxy, không gọi webhook trực tiếp từ browser

### Must NOT Have (Guardrails)
- Không dùng MediaRecorder/captureStream kiểu quay realtime
- Không thêm nút tải local
- Không thêm retry logic Discord
- Không đổi behavior playback realtime hiện có ngoài scope video export

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — toàn bộ verification do agent chạy bằng tool/command cụ thể.

### Test Decision
- **Infrastructure exists**: NO (không có test runner chính thức cho flow này)
- **Automated tests**: None (theo user ưu tiên QA thực thi thật)
- **Framework**: N/A

### QA Policy
Mỗi task đều phải có QA scenario (happy + error), bằng công cụ thực thi:
- **Frontend/UI**: Playwright
- **API/Backend**: curl qua Bash
- **Module behavior**: script chạy nhanh bằng Node/Bash

Evidence lưu tại `.sisyphus/evidence/task-{N}-{scenario}.ext`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation — chạy song song tối đa):
- T1: Chuẩn hóa spec timeline deterministic + conversion rules
- T2: Tách helper tính motion parity từ logic realtime hiện tại
- T3: Thiết kế upload contract client->backend->Discord
- T4: Thiết kế giới hạn output (720p/60/WebM/size guard)
- T5: Thiết kế UI state machine cho render/upload/error

Wave 2 (core implementation blocks):
- T6: Implement timeline/frame sampler module
- T7: Implement WebM encode module (WebCodecs + muxer + backpressure)
- T8: Implement renderer orchestration (offline render loop + state restore)
- T9: Implement backend proxy endpoint nhận file WebM và forward Discord
- T10: Implement UI integration (start/progress/success/fail)

Wave 3 (integration and hardening):
- T11: End-to-end wiring in GCodeViewer + services
- T12: Error handling matrix (unsupported codec, oversize, webhook fail)
- T13: Performance tuning (adaptive acceleration without breaking motion)
- T14: Regression checks (fullscreen/viewer interaction unaffected)

Wave 4 (verification):
- T15: Agent-run QA scenarios full happy path
- T16: Agent-run QA scenarios lỗi và edge timing
- T17: Evidence audit & acceptance mapping

Wave FINAL (independent parallel review):
- F1: Plan compliance audit (oracle)
- F2: Code quality review
- F3: Real manual QA replay (agent-executed)
- F4: Scope fidelity check

### Dependency Matrix
- T1: blocked by none -> blocks T6, T8, T11
- T2: blocked by none -> blocks T6, T8
- T3: blocked by none -> blocks T9, T11
- T4: blocked by none -> blocks T7, T12, T13
- T5: blocked by none -> blocks T10, T11
- T6: blocked by T1,T2 -> blocks T8,T11,T13
- T7: blocked by T4 -> blocks T8,T11,T12
- T8: blocked by T1,T2,T6,T7 -> blocks T11,T13,T15,T16
- T9: blocked by T3 -> blocks T11,T15
- T10: blocked by T5 -> blocks T11,T15
- T11: blocked by T3,T5,T6,T7,T8,T9,T10 -> blocks T14,T15,T16
- T12: blocked by T4,T7,T9,T11 -> blocks T16,T17
- T13: blocked by T4,T6,T8,T11 -> blocks T15,T17
- T14: blocked by T11 -> blocks T17
- T15: blocked by T8,T9,T10,T11,T13 -> blocks T17,F3
- T16: blocked by T8,T11,T12 -> blocks T17,F3
- T17: blocked by T12,T13,T14,T15,T16 -> blocks F1,F2,F4

### Agent Dispatch Summary
- Wave 1: 5 tasks — quick/unspecified-high/deep mix
- Wave 2: 5 tasks — deep + unspecified-high
- Wave 3: 4 tasks — deep + quick
- Wave 4: 3 tasks — unspecified-high + deep
- FINAL: 4 tasks — oracle/deep/unspecified-high

---

## TODOs

- [ ] 1. Chốt conversion spec GCode -> video timeline deterministic

  **What to do**:
  - Viết spec rõ cách chuyển command thành trạng thái frame 1/60
  - Chốt rule cho G0 visible và G4 exact dwell
  - Chốt cách lấy speed từ `playbackSpeed`

  **Must NOT do**:
  - Không thêm rule ngẫu nhiên ngoài spec
  - Không dùng wall-clock làm nguồn chân lý cho frame timeline

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: cần chính xác logic/timing
  - **Skills**: `[]`
    - Không cần skill đặc thù, tập trung reasoning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T8, T11
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1143-1173` — nguồn logic playback realtime hiện có
  - `services/gcodeService.ts` (khối parse `F`) — nguồn feed để tính vận tốc

  **WHY Each Reference Matters**:
  - Đây là nguồn truth để bảo đảm video “như bình thường”, không chế logic mới lệch behavior.

  **Acceptance Criteria**:
  - [ ] Có tài liệu conversion rule rõ cho linear move, rapid move, dwell
  - [ ] Rule sử dụng `playbackSpeed` được mô tả cụ thể

  **QA Scenarios**:
  Scenario: Spec đủ rõ
    Tool: Bash (read/grep)
    Steps:
      1. Mở file spec và tìm các mục linear/rapid/dwell
      2. Xác nhận có công thức timing theo fixed 1/60
    Expected Result: đủ 3 mục và có rule speed source
    Evidence: `.sisyphus/evidence/task-1-spec-check.txt`

  Scenario: Spec thiếu nhánh edge
    Tool: Bash (grep)
    Steps:
      1. Kiểm tra xem có rule G4 hay không
      2. Nếu thiếu, đánh fail
    Expected Result: nếu thiếu G4 thì reject task
    Evidence: `.sisyphus/evidence/task-1-edge-check.txt`

  **Commit**: NO

- [ ] 2. Tách helper motion parity từ playback realtime

  **What to do**:
  - Rút phần tính `index/progress/position` thành helper dùng chung
  - Đảm bảo kết quả giống playback loop hiện tại

  **Must NOT do**:
  - Không đổi behavior playback realtime đang chạy

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T8
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1145-1173` — state machine hiện tại

  **Acceptance Criteria**:
  - [ ] Helper trả kết quả vị trí mượt theo segment
  - [ ] Không có teleport khi chuyển segment

  **QA Scenarios**:
  Scenario: Happy path interpolation
    Tool: Node/Bash test script
    Steps:
      1. Feed chuỗi 2 segment đơn giản
      2. Kiểm tra vị trí giữa segment nằm giữa 2 điểm
    Expected Result: vị trí nội suy đúng
    Evidence: `.sisyphus/evidence/task-2-interp.txt`

  Scenario: Segment độ dài 0
    Tool: Node/Bash
    Steps:
      1. Feed segment trùng điểm
      2. Chạy helper
    Expected Result: không NaN/không crash
    Evidence: `.sisyphus/evidence/task-2-zero-len.txt`

  **Commit**: NO

- [x] 3. Thiết kế contract upload client -> backend -> Discord

  **What to do**:
  - Định nghĩa payload multipart (`file`, metadata)
  - Định nghĩa response success/fail chuẩn cho UI

  **Must NOT do**:
  - Không để browser gọi webhook Discord trực tiếp

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T9, T11
  - **Blocked By**: None

  **References**:
  - `server.js:110-133` — proxy JSON hiện có

  **Acceptance Criteria**:
  - [ ] Có contract request/response cụ thể
  - [ ] Có mã lỗi rõ để UI hiển thị

  **QA Scenarios**:
  Scenario: Contract valid
    Tool: curl
    Steps:
      1. Gọi endpoint với payload mẫu hợp lệ
      2. Kiểm tra schema response
    Expected Result: response có `ok` + `message` rõ
    Evidence: `.sisyphus/evidence/task-3-contract-ok.json`

  Scenario: Missing file
    Tool: curl
    Steps:
      1. Gửi thiếu `file`
      2. Kiểm tra lỗi
    Expected Result: trả 4xx và message dễ hiểu
    Evidence: `.sisyphus/evidence/task-3-contract-error.json`

  **Commit**: NO

- [x] 4. Chốt output guardrails (720p/60/WebM/size limit)

  **What to do**:
  - Đặt default 1280x720 @60fps
  - Đặt bitrate/profile và giới hạn size trước khi upload

  **Must NOT do**:
  - Không silently upload file quá lớn

  **Recommended Agent Profile**:
  - **Category**: `quick`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T7,T12,T13
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx.old:1305-1333` — cấu hình encoder đã từng dùng

  **Acceptance Criteria**:
  - [ ] Có giới hạn size trước upload
  - [ ] Có thông báo lỗi “file quá lớn” rõ ràng

  **QA Scenarios**:
  Scenario: Cấu hình mặc định
    Tool: script/assert
    Steps:
      1. Kiểm tra config export
      2. Xác nhận 720p, 60fps
    Expected Result: đúng default
    Evidence: `.sisyphus/evidence/task-4-defaults.txt`

  Scenario: Size overflow
    Tool: script
    Steps:
      1. Mô phỏng blob lớn hơn limit
      2. Trigger upload
    Expected Result: chặn upload + báo lỗi
    Evidence: `.sisyphus/evidence/task-4-size-guard.txt`

  **Commit**: NO

- [x] 5. Thiết kế UI state machine render/upload

  **What to do**:
  - Chốt state: idle -> rendering -> uploading -> done/error
  - Chốt text tiếng Việt đơn giản cho từng state

  **Must NOT do**:
  - Không dùng thông báo mơ hồ

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T10,T11
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx` toolbar/AI panel khu vực nút thao tác

  **Acceptance Criteria**:
  - [ ] Mỗi state có label rõ
  - [ ] Có trạng thái lỗi phân biệt render lỗi vs upload lỗi

  **QA Scenarios**:
  Scenario: Happy flow labels
    Tool: Playwright
    Steps:
      1. Bấm render
      2. Theo dõi label chuyển state
    Expected Result: chuyển đúng thứ tự state
    Evidence: `.sisyphus/evidence/task-5-state-flow.png`

  Scenario: Upload fail
    Tool: Playwright + mock
    Steps:
      1. Mock API fail
      2. Bấm render
    Expected Result: hiện lỗi upload rõ
    Evidence: `.sisyphus/evidence/task-5-state-error.png`

  **Commit**: NO

- [ ] 6. Implement timeline/frame sampler module
  **What to do**: hiện thực engine fixed-step 1/60 dựa trên spec T1+T2
  **Must NOT do**: không dùng `setTimeout` realtime pacing
  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2 | Blocked By: T1,T2 | Blocks: T8,T11,T13
  **References**: `components/GCodeViewer.tsx:1145-1173`
  **Acceptance Criteria**: frame position đúng liên tục
  **QA**: happy + zero-feed/error evidence `task-6-*.txt`
  **Commit**: NO

- [ ] 7. Implement WebM encoder module + backpressure
  **What to do**: encode WebM 60fps, queue guard theo encoder pressure
  **Must NOT do**: không fallback MediaRecorder
  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 2 | Blocked By: T4 | Blocks: T8,T11,T12
  **References**: `components/GCodeViewer.tsx.old:1305-1411`, `package.json` webm-muxer
  **Acceptance Criteria**: encode ổn định, không queue overflow
  **QA**: happy + forced queue stress evidence `task-7-*.txt`
  **Commit**: NO

- [ ] 8. Implement offline renderer orchestration + restore state
  **What to do**: render loop nhanh, giữ parity motion, restore UI/view state sau xong/fail
  **Must NOT do**: không để app kẹt isRendering=true khi fail
  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2 | Blocked By: T1,T2,T6,T7 | Blocks: T11,T13,T15,T16
  **References**: GCodeViewer playback loop + old export flow
  **Acceptance Criteria**: motion mượt, state phục hồi đúng
  **QA**: happy + injected error evidence `task-8-*.png/txt`
  **Commit**: NO

- [ ] 9. Implement backend proxy endpoint cho multipart WebM
  **What to do**: nhận file từ client, forward webhook Discord 1 lần
  **Must NOT do**: không lưu file lâu dài
  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 2 | Blocked By: T3 | Blocks: T11,T15
  **References**: `server.js:110-133`
  **Acceptance Criteria**: forward thành công + lỗi rõ
  **QA**: curl happy + missing file/error evidence `task-9-*.json`
  **Commit**: NO

- [ ] 10. Implement UI integration render/upload status
  **What to do**: nối state machine vào nút thao tác
  **Must NOT do**: không thêm local download
  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 2 | Blocked By: T5 | Blocks: T11,T15
  **References**: UI sections in GCodeViewer
  **Acceptance Criteria**: user thấy tiến trình rõ bằng tiếng Việt dễ hiểu
  **QA**: Playwright happy + fail evidence `task-10-*.png`
  **Commit**: NO

- [ ] 11. End-to-end wiring trong GCodeViewer
  **What to do**: nối module timeline/encoder/renderer/upload thành luồng hoàn chỉnh
  **Must NOT do**: không đổi logic playback tool chính ngoài export flow
  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 3 | Blocked By: T3,T5,T6,T7,T8,T9,T10 | Blocks: T14,T15,T16
  **References**: GCodeViewer hiện tại + server endpoint
  **Acceptance Criteria**: bấm 1 nút chạy full flow
  **QA**: full happy + webhook fail evidence `task-11-*.txt/png`
  **Commit**: YES (group with T12,T13)

- [ ] 12. Error handling matrix
  **What to do**: map lỗi codec unsupported, oversize, proxy fail, webhook fail
  **Must NOT do**: không alert mơ hồ kiểu “Lỗi gửi báo cáo”
  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3 | Blocked By: T4,T7,T9,T11 | Blocks: T16,T17
  **References**: lỗi history trong GCodeViewer.old
  **Acceptance Criteria**: mỗi lỗi có message rõ và action rõ
  **QA**: simulate từng lỗi, evidence `task-12-*.txt`
  **Commit**: YES (group with T11,T13)

- [ ] 13. Performance tuning adaptive acceleration
  **What to do**: tối ưu batch render để nhanh nhưng giữ motion quality
  **Must NOT do**: không hy sinh continuity để lấy tốc độ
  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 3 | Blocked By: T4,T6,T8,T11 | Blocks: T15,T17
  **References**: old performance attempts commits/history
  **Acceptance Criteria**: render time < playback duration rõ rệt
  **QA**: benchmark evidence `task-13-benchmark.txt`
  **Commit**: YES (group with T11,T12)

- [ ] 14. Regression checks (fullscreen + viewer)
  **What to do**: xác nhận các fix fullscreen hiện có không bị ảnh hưởng
  **Must NOT do**: không đụng logic unrelated
  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 3 | Blocked By: T11 | Blocks: T17
  **References**: `.sisyphus/plans/gcodeviewer-fullscreen-fix.md`
  **Acceptance Criteria**: fullscreen vẫn mượt và lock đúng
  **QA**: Playwright evidence `task-14-fullscreen.png`
  **Commit**: NO

- [ ] 15. QA full happy path
  **What to do**: chạy scenario đầy đủ từ upload GCode tới Discord nhận video
  **Must NOT do**: không skip bước capture evidence
  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 4 | Blocked By: T8,T9,T10,T11,T13 | Blocks: T17,F3
  **Acceptance Criteria**: video nhận được, playback mượt
  **QA**: evidence `.sisyphus/evidence/task-15-happy.*`
  **Commit**: NO

- [ ] 16. QA edge/error path
  **What to do**: test oversize, network fail, unsupported encode path
  **Must NOT do**: không bỏ qua negative case
  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 4 | Blocked By: T8,T11,T12 | Blocks: T17,F3
  **Acceptance Criteria**: fail graceful, không crash
  **QA**: evidence `.sisyphus/evidence/task-16-error.*`
  **Commit**: NO

- [ ] 17. Evidence audit + acceptance mapping
  **What to do**: map từng acceptance criterion với evidence file tương ứng
  **Must NOT do**: không đánh dấu done nếu thiếu evidence
  **Recommended Agent Profile**: `writing`
  **Parallelization**: Wave 4 | Blocked By: T12,T13,T14,T15,T16 | Blocks: F1,F2,F4
  **Acceptance Criteria**: ma trận criterion->evidence đầy đủ
  **QA**: output summary `.sisyphus/evidence/task-17-audit.md`
  **Commit**: NO

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Output: `Build/Lint/Types status | Slop checks | VERDICT`

- [ ] F3. **Real Manual QA (agent-executed)** — `unspecified-high`
  Output: `Scenarios pass count | Integration checks | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Output: `No scope creep/no contamination | VERDICT`

---

## Commit Strategy

- Group commit A (core): `feat(gcode): rebuild deterministic WebM export pipeline`
  - Includes: T11,T12,T13
  - Pre-commit check: build + scenario scripts

- Group commit B (backend proxy): `feat(server): add multipart WebM forward endpoint for discord`
  - Includes: T9
  - Pre-commit check: curl endpoint tests

---

## Success Criteria

### Verification Commands
```bash
npm run build
# Expected: build success

# proxy happy path (example)
curl -X POST http://localhost:3000/api/discord-video -F "file=@sample.webm" -F "payload_json={\"content\":\"test\"}"
# Expected: {"ok":true,...}
```

### Final Checklist
- [ ] Motion video mượt như playback realtime
- [ ] 60 FPS, 720p, WebM only
- [ ] Render nhanh hơn realtime rõ rệt
- [ ] Discord nhận file qua backend proxy
- [ ] Không local download, không retry
- [ ] G0 visible, G4 exact dwell
- [ ] Đầy đủ evidence cho happy + error paths
