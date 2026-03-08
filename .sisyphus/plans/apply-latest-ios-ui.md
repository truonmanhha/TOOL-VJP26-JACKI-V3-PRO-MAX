# Apply Latest iOS UI for ChatBot

## Context
The user has provided a new, refined HTML template for the ChatBot UI. This template:
- Specifically targets the exact dimensions: `w-[320px] h-[568px]`.
- Removes excess black background space.
- Includes a CSS rule to hide scrollbars globally (which we'll apply locally).
- Tightens the padding/margins to fit perfectly inside the iPhone 5 frame.

## Plan
1. Edit `components/ChatBot.tsx`.
2. Find the rendered chat window markup (inside `isOpen`).
3. Replace the `nav`, `main`, and `footer` blocks with the exact structure from the user's new HTML.
4. Integrate the new `<style>` section which hides scrollbars: `* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`
5. Map the existing dynamic `messages.map` logic over the new DOM structure.
6. Make sure the toggle `BotVisual` button and floating behavior remains untouched.
