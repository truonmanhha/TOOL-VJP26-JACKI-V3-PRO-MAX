# Make SVGs flush with the outer border

## Context
User says "cho sát với cái viền ngoài luôn đi" (make it flush/touch the outer border).
The SVG wrapper in `Workspace.tsx` currently has `p-2` (padding) which creates a gap between the SVG content and the border.
Also, the `renderSettingsSVG.tsx` SVGs might still have some internal padding/margins.

## Plan
1. Edit `components/NestingAX/Workspace.tsx`.
2. Find the wrapper div for the single dynamic preview: `w-full aspect-[4/3] max-h-[220px] relative p-2 shadow-inner mb-4 flex items-center justify-center bg-slate-700 border-slate-500 border rounded-lg`.
3. Remove `p-2`. Change `rounded-lg` to something that clips well if needed (like `rounded-md overflow-hidden`).
4. Look at `renderSettingsSVG.tsx` and ensure `w-full h-full` really goes to the edges (no inner padding in the returned wrapper).
