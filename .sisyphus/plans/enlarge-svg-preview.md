# Enlarge SVG Preview

## Context
User states: "khung preview hơi bé so với khung viền của preview" (The preview frame is a bit small compared to its border frame).
This happens because the SVGs generated in `renderSettingsSVG.tsx` have `max-w-[200px]`, but the wrapper container in `Workspace.tsx` (`w-full aspect-[4/3]`) is expanding to the full width of the column, causing the actual SVG to look small in the middle of a larger background.

## Plan
1. In `components/NestingAX/renderSettingsSVG.tsx`, remove the strict `max-w-[200px]` constraints from the outer `div`s. We want them to fully fill their parent containers.
2. We can also remove the redundant borders/backgrounds from `renderSettingsSVG.tsx` if the wrapper in `Workspace.tsx` already provides them, OR remove the background/border from `Workspace.tsx` and let `renderSettingsSVG.tsx` handle it completely.
   - Actually, looking at `Workspace.tsx`, it has a wrapper `bg-slate-700 border-slate-500 border rounded-lg`. And `renderSettingsSVG.tsx` ALSO has `bg-slate-800 rounded shadow-inner p-2 border border-slate-600`. This creates a box inside a box.
3. Fix:
   - Remove the background and border classes from `renderSettingsSVG.tsx` so the SVGs just fill 100% width and height cleanly. Let `Workspace.tsx` handle the outer border.
   - Alternatively, keep the SVGs as they are but remove `max-w-[200px]` and change it to `w-full h-full` so they fill the wrapper box.
