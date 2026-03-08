# Implement New ChatBot UI (iOS Minimalist Style)

## Context
User wants to completely replace the existing Matrix Rain ChatBot UI (`components/ChatBot.tsx`) with a new HTML template provided at `/mnt/d/ALL TOOL/DU AN TOOL VJP26 PRO/TT/NESTING 1/Giao diện của chat bot ai/Giao diện chính/code.html`.
The new design is an iOS-inspired, sleek, modern dark mode UI with glassmorphism, completely abandoning the Matrix aesthetic.

## Assets
- The HTML file provided (`code.html`).
- The original logic inside `ChatBot.tsx` (the Gemini API call, the `evadeSafetyFilters`, the typing effect, and the state variables).

## Key UI Differences
- Removed Matrix Rain `<canvas>`.
- Rounded bubbles (Apple style) instead of sharp terminal boxes.
- Gradients and iOS-style blur (`backdrop-filter: blur(20px)`).
- New specific custom colors in Tailwind config (need to inline or add).

## Plan
1. Copy the structure and Tailwind classes from `code.html` into the React component `ChatBot.tsx`.
2. Extract the custom CSS (`.glass`, `.ios-nav-glass`, `.user-gradient`, `.input-glow`) and either convert them to inline Tailwind classes using arbitrary values (e.g. `bg-[#1C1C1E]/70 backdrop-blur-[20px]`) OR inject them via a `<style>` block in the component since the project uses CDN Tailwind.
3. Map the state variables (`messages`, `isLoading`, `isOpen`) to the new HTML structure.
4. Hook up the inputs (textarea) and the send button to the existing logic.
5. Keep the `TypewriterMessage` component or adjust it to fit the new rounded bubble style.
