# ChatBot AI Modern Light & Glass Redesign

## TL;DR
> **Quick Summary**: Completely redesign the ChatBot UI to feature a modern, high-tech AI aesthetic heavily focused on lighting effects (glow, neon, gradients) combined with glassmorphism.
> 
> **Deliverables**:
> - Updated UI in `components/ChatBot.tsx`.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO

---

## Context

### Original Request
"Thiết kế giao diện cho chat bot ai mang phong cách thiết kế hiện đại , + có sự kết hợp của ánh sáng , hiệu ứng ánh sáng AI , + kết hợp 1 chút glass"
(Design the AI chatbot interface with a modern style + combination of light, AI lighting effects + combined with a bit of glass)

### UI/UX Concept: "Neon Glass & AI Core"
- **Background**: Deep transparent glass (`bg-black/40 backdrop-blur-xl`) with a very subtle animated gradient mesh behind it to simulate an "AI Core" breathing.
- **Lighting Effects**: 
  - Borders should have a subtle glow (`border-white/10` with `shadow-[0_0_20px_rgba(59,130,246,0.3)]`).
  - Active elements (like the send button or thinking state) should have a neon pulse.
  - The header should look like a sleek control bar with glowing text.
- **Bubbles**: 
  - User: Vibrant glowing gradient (e.g., Cyberpunk purple/blue) with inner shadow.
  - AI: Pure frosted glass with a glowing left border to signify "AI transmission".

---

## Execution Strategy

Wave 1:
├── Task 1: Overhaul UI with Neon/Light & Glassmorphism [visual-engineering]

Wave FINAL:
└── F1: Code Quality Check

---

## TODOs

- [ ] 1. Overhaul UI with Neon/Light & Glassmorphism

  **What to do**:
  - Edit `components/ChatBot.tsx`.
  - Add an animated gradient orb or glow effect *behind* the main content but inside the container to give it that "AI Light" feel.
  - Upgrade the main container: keep the iPhone 5 dimensions but make the borders glow softly (e.g., `border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]`).
  - Redesign message bubbles: 
    - AI bubble: `bg-slate-900/50 backdrop-blur-md border-l-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]`.
    - User bubble: `bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]`.
  - Enhance the Dynamic Island input to have a neon rim when focused.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`
