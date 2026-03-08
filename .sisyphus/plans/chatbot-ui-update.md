# ChatBot UI/UX Overhaul

## TL;DR
> **Quick Summary**: Redesign the existing ChatBot component to have the exact dimensions of an iPhone 5 (320x568px) with a premium, smooth, glassmorphic UI and refined Framer Motion animations.
> 
> **Deliverables**:
> - Updated `components/ChatBot.tsx` with new dimensions, styling, and animations.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential
> **Critical Path**: Update ChatBot.tsx -> Verify UI.

---

## Context

### Original Request
Update the UI of the AI chatbot. Make its dimensions match an iPhone 5 (320px x 568px). Design a beautiful, premium interface with high-quality, subtle animations inside the chatbot.

### Interview Summary
**Key Discussions**:
- Dimensions set to strictly 320x568 (iPhone 5).
- UI will follow modern premium patterns: glassmorphism, rounded corners, soft shadows.
- Animations will use Framer Motion for smooth mounting/unmounting and message list entry.

---

## Work Objectives

### Core Objective
Overhaul `components/ChatBot.tsx` to serve as a premium widget with iPhone 5 dimensions and smooth micro-interactions.

### Concrete Deliverables
- `components/ChatBot.tsx` updated with the new UI and animations.

### Definition of Done
- [ ] Chat panel measures exactly 320px by 568px.
- [ ] Panel opens/closes with a smooth Framer Motion spring/tween.
- [ ] Messages animate smoothly upon entering the list.
- [ ] UI looks polished (glassmorphism, subtle borders, modern bubble styles).

### Must Have
- Framer Motion animations for messages and panel.
- Exact iPhone 5 dimensions (`w-[320px] h-[568px]`).

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none
- **Agent-Executed QA**: Playwright for UI rendering checks.

### QA Policy
Every task MUST include agent-executed QA scenarios using Playwright to verify the UI renders correctly and dimensions match.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (UI Overhaul):
├── Task 1: Update ChatBot UI & Animations [visual-engineering]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Playwright UI QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 -> F1-F4
Parallel Speedup: N/A
Max Concurrent: 1 (Wave 1)

---

## TODOs

- [ ] 1. Update ChatBot UI & Animations (ULTRA PREMIUM)

  **What to do**:
  - Open `components/ChatBot.tsx`.
  - Modify the main chat window container to have fixed dimensions: `w-[320px] h-[568px]`.
  - **The "Apple/Vercel" Premium Feel**: 
    - **Container**: `bg-black/40 backdrop-blur-2xl`, deep rounded corners `rounded-[32px]`, complex layered shadow `shadow-[0_0_40px_rgba(0,0,0,0.5)]`, and a 1px inside border `border border-white/10` with a subtle inner glow `shadow-inner`.
    - **Header**: Floating/integrated header. Cần có thanh ngang nhỏ (handle) như iOS kéo thả ở trên cùng (`w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2`). AI Name text gradient mượt mà.
    - **Messages Area**: Custom invisible scrollbar. Padding rộng rãi để không dính viền.
    - **Message Bubbles**: 
      - User: Bubble bo góc `rounded-2xl rounded-tr-sm` với màu gradient sang trọng (vd: `bg-gradient-to-br from-indigo-500 to-purple-600`), chữ trắng rõ nét. Đổ bóng phát sáng nhẹ `shadow-[0_4px_15px_rgba(99,102,241,0.3)]`.
      - AI: Bubble bo góc `rounded-2xl rounded-tl-sm` kiểu kính mờ (Frosted glass) `bg-white/10 backdrop-blur-md border border-white/5`, chữ `text-slate-100`.
    - **Input Area (Dynamic Island Style)**: Floating input pill cách đáy một chút. Vùng bao quanh bo tròn hoàn toàn `rounded-full bg-black/60 border border-white/10`. Nút gửi (Send) nằm gọn trong pill, đổi thành hình tròn màu sáng khi có chữ.
  - **Animations (Framer Motion)**:
    - **Panel Open**: Mở ra kiểu Scale mượt (như mở app iOS) từ vị trí nút bấm: `initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}`.
    - **Messages**: Load tuần tự `initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}` để tin nhắn nổi lên mềm mại.
    - **Typing Indicator**: Hiệu ứng sóng (Wave) nhấp nháy cho AI đang gõ chữ.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is a pure UI/UX styling and animation task.
  - **Skills**: `frontend-ui-ux`
    - `frontend-ui-ux`: To design the "premium" feel and handle Framer Motion.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1

  **References**:
  - `components/ChatBot.tsx`

  **Acceptance Criteria**:
  - [ ] Panel has fixed width 320px and height 568px.
  - [ ] Animations run without errors.

  **QA Scenarios**:

  ```
  Scenario: Chat panel opens with correct dimensions
    Tool: Playwright
    Preconditions: App running, ChatBot closed
    Steps:
      1. Click the ChatBot floating icon to open it.
      2. Measure the dimension of the expanded chat window container.
    Expected Result: Width is 320px, height is 568px.
    Failure Indicators: Dimensions do not match, or it throws an error.
    Evidence: .sisyphus/evidence/task-1-chatbot-dimensions.png
  ```

  **Commit**: YES
  - Message: `feat(ui): premium chatbot overhaul with iphone 5 dimensions`
  - Files: `components/ChatBot.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Success Criteria
- [ ] Chatbot panel has exactly 320px width and 568px height.
- [ ] Premium design (glassmorphism, clean input) is applied.
