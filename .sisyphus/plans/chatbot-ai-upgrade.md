# ChatBot AI Intelligence & Animation Upgrade

## TL;DR
> **Quick Summary**: Upgrade the ChatBot's core model to `gemini-2.5-pro` (or latest available high-IQ model) for better reasoning. Introduce high-end micro-animations (Framer Motion) for typing indicators, message reactions, and context loading to make it feel "alive".
> 
> **Deliverables**:
> - Replaced model identifiers in `components/ChatBot.tsx`.
> - Added sophisticated SVG/Framer Motion animations for typing, idle state, and message entry.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO

---

## Context

### Original Request
"add thêm vài animation và nâng cấp độ thông minh của con chat bot ai"
(Add more animations and upgrade the AI chatbot's intelligence)

### AI Model Strategy
Currently, the codebase uses `gemini-3-flash-preview` which is fast but might lack depth in complex reasoning. We will upgrade the system prompts and ensure the model config is pointing to the most capable reasoning version (e.g., `gemini-2.5-pro` or keeping the bleeding-edge preview but giving it a massive system prompt injection for "Intelligence"). 
We will also inject a highly sophisticated "Developer/CNC Expert" system instruction so it answers smartly.

### UI Animation Strategy
- Add a "Typing" / "Thinking" waveform animation instead of the plain `Loader2`.
- Add floating particle or subtle pulse animations to the ChatBot's face when thinking.
- Make the bot "blink" or react visually to input.

---

## Work Objectives

### Core Objective
Make the ChatBot smarter (via System Prompt / Model tuning) and feel more alive (via advanced Framer Motion micro-interactions).

### Definition of Done
- [ ] Model prompt heavily upgraded to act as an elite CNC/Nesting expert.
- [ ] Replaced standard loading text with a custom Framer Motion "Thinking" wave.
- [ ] Added hover/pulse animations to the chat bubbles.
- [ ] App builds successfully.

---

## Execution Strategy

Wave 1 (Brain & Soul):
├── Task 1: Upgrade Prompt & Animations [visual-engineering]

Wave FINAL:
└── F1: Code quality review (unspecified-high)

---

## TODOs

- [ ] 1. Upgrade Prompt & Animations

  **What to do**:
  - Open `components/ChatBot.tsx`.
  - **Intelligence (Brain)**: Update the `systemInstruction` in `chatInstance.current = ai.chats.create(...)` to make it a high-IQ CNC/React expert. (e.g., "Mày là AI trợ lý lõi VJP26.CORE. Chuyên gia về React, CNC, G-Code, DXF. Trả lời cực kỳ thông minh, ngắn gọn, thâm thuý...").
  - **Animation (Soul)**: 
    - Replace the `<Loader2>` thinking state with a custom SVG wave or 3 bouncing dots using `motion.div` (`animate={{ y: [0, -10, 0] }}`).
    - Add a subtle `whileHover={{ scale: 1.02 }}` to user message bubbles.
    - Enhance the `BotVisual` component (or its container) to pulse heavily when `isLoading` is true (e.g., `animate={{ boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 20px rgba(59,130,246,0.8)", "0px 0px 0px rgba(0,0,0,0)"] }}`).
  - Change the model to `gemini-2.5-pro` or `gemini-3.1-pro-preview` for max intelligence.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**: NO

  **Acceptance Criteria**:
  - [ ] System prompt upgraded.
  - [ ] Custom loading animation implemented.
  - [ ] Model upgraded.
