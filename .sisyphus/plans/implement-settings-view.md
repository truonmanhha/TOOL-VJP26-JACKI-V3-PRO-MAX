# Implement Settings View

## Context
The user wants clicking the gear/settings icon in the Top Navigation to open the provided Settings HTML layout.
Currently, the settings button does nothing. We need to toggle a view state and render the new UI verbatim.

## Plan
1. In `components/ChatBot.tsx`, add a state `showSettings`:
   `const [showSettings, setShowSettings] = useState(false);`
2. Update the gear button:
   `<button onClick={() => setShowSettings(true)} className="text-primary"> ...`
3. Wrap the content of `<motion.div className="relative w-[320px] ...">` inside an `if/else` or ternary for `showSettings`.
   - If `!showSettings`: Render the existing Chat UI (nav, main, footer).
   - If `showSettings`: Render the new Settings UI (nav, main, footer) from `settings-ui.html`.
4. In the Settings UI, attach `onClick={() => setShowSettings(false)}` to both "Quay lại" and "Xong" buttons.
5. Translate the tailwind `@apply` classes into React `className` equivalents because CDN Tailwind doesn't parse inline `@apply` inside React correctly.
   - `.ios-toggle`: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`
   - `.ios-toggle-dot`: `inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform`
   - `.ios-list-item`: `flex items-center justify-between px-3 py-2.5 bg-[#1C1C1E] active:bg-neutral-800 transition-colors`
   - `.ios-list-group`: `rounded-xl overflow-hidden mb-6`
   - `.ios-section-header`: `px-4 pb-1.5 text-[12px] uppercase text-white/40 tracking-tight`
   - Replace these string literals inside the JSX.
6. Verify colors mapping: `bg-ios-bg` -> `bg-[#000000]`, `bg-ios-secondary-bg` -> `bg-[#1C1C1E]`, `bg-ios-green` -> `bg-[#34C759]`, `bg-ios-separator` -> `bg-white/10`.
