# ChatBot UI/UX Redesign: Matrix Rain Theme

## TL;DR
> **Quick Summary**: Redesign the ChatBot UI to match "Idea 2: Matrix Rain". It will feature a dark hacker aesthetic with falling digital rain (like The Matrix) in the background of the chat window.
> 
> **Deliverables**:
> - Matrix rain background component added to `components/ChatBot.tsx`.
> - UI adjusted to a darker, more terminal-like aesthetic to fit the theme.
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO

---

## Context

### Original Request
"số 2" (Idea #2: Matrix Rain)

### UI/UX Concept: Matrix Rain
- **Background**: Replace the existing ambient glow with a `<canvas>` element rendering digital rain (falling green/white characters).
- **Aesthetic**: Deep dark backgrounds (`bg-black`), monospace fonts for code/system elements, sharp green glowing accents (`text-emerald-500`, `border-emerald-500/50`).
- **Bubbles**: Remove soft gradients. User bubbles should look like terminal inputs (`> user_input`), AI bubbles should look like raw system outputs with a subtle green hacker tint.

---

## Execution Strategy

Wave 1:
├── Task 1: Implement Matrix Rain Canvas & Hacker UI [visual-engineering]

Wave FINAL:
└── F1: Code Quality Check

---

## TODOs

- [ ] 1. Implement Matrix Rain Canvas & Hacker UI

  **What to do**:
  - Edit `components/ChatBot.tsx`.
  - Create a new `MatrixRain` component that uses a `<canvas>` and `requestAnimationFrame` to draw falling characters (Katakana, Latin, numbers) in green hues.
  - Insert `<MatrixRain />` as the absolute background layer of the main ChatBot container.
  - Update the main container: `bg-black border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]`.
  - Update the Header: Remove soft glows, make it look more like a terminal header (e.g., `text-emerald-400 font-mono`).
  - Redesign message bubbles:
    - User: `bg-transparent border border-emerald-500/50 text-emerald-400 font-mono rounded-none`.
    - AI: `bg-black/80 backdrop-blur-md border-l-2 border-emerald-500 text-emerald-50 rounded-none shadow-none`.
  - Update the Input pill: Make it a sharp rectangle, terminal-style input `bg-black border border-emerald-500/50 text-emerald-400 font-mono rounded-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.4)]`.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`
