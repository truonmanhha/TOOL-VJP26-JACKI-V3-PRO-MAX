# Implement iOS ChatBot Settings

## Context
User provided an HTML template for the Settings page of the iOS ChatBot.
When clicking the gear icon, the chatbot should transition to this settings view.
The user wants the exact HTML layout applied, stripping the outer body tag, and preserving all text and structure.

## Plan
1. Edit `components/ChatBot.tsx`.
2. Add a `showSettings` state (boolean, default false).
3. Find the Settings gear icon button in the ChatBot Top Navigation and add `onClick={() => setShowSettings(true)}`.
4. Create a conditional rendering block inside the main `motion.div` wrapper:
   - If `!showSettings`, render the existing Chat UI (`<nav>`, `<main>`, `<footer>`).
   - If `showSettings`, render the new Settings UI (`<nav>`, `<main>`, `<footer>`).
5. In the Settings UI, hook the "Quay lại" and "Xong" buttons to `setShowSettings(false)`.
6. Add the new CSS (`.ios-toggle`, `.ios-list-item`, `.ios-list-group`, `.ios-section-header`, etc.) into the existing `<style>` block. Tailwind `@layer` might not work in the inline `<style>` tag since Tailwind is loaded via CDN, so we need to convert those `@apply` rules to regular React `className`s or just expand the classes on the elements directly. Wait, the user used `@apply` in the HTML:
   ```css
   .ios-toggle { @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none; }
   ```
   Since we use CDN Tailwind without a build step for these `@apply`, we MUST manually expand these classes directly onto the JSX elements, OR keep them in style if the project supports it. The project uses standard Vite with Tailwind CDN. Actually CDN Tailwind *doesn't* support `@apply` in `<style>` tags natively unless using a plugin. Better to expand them directly into the JSX elements to ensure they work.

Let's expand the classes:
- `.ios-toggle`: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`
- `.ios-toggle-dot`: `inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform`
- `.ios-list-item`: `flex items-center justify-between px-3 py-2.5 bg-[#1C1C1E] active:bg-neutral-800 transition-colors`
- `.ios-list-group`: `rounded-xl overflow-hidden mb-6`
- `.ios-section-header`: `px-4 pb-1.5 text-[12px] uppercase text-white/40 tracking-tight`
