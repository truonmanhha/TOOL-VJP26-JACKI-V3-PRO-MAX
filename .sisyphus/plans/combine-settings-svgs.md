# Combine SVGs into a single Right Column

## Context
User wants the newly created Gap SVG to be displayed alongside the other SVGs (Pack Direction, Guillotine) in an "All-in-One" preview column, instead of being isolated in its own grid under the "Gap Settings" fieldset.

## Plan
Looking at `Workspace.tsx`, the layout relies on a tabs system (`general`, `engine`, `rectengine`, etc.).
The Gap settings and the "Options/Engine" settings are currently in different tabs or different sections.
Wait, let's verify where Gap settings are. Ah, Gap settings are actually in the `engine` tab!

Let's do a grep for the Gap settings again to be sure:
```bash
grep -n -B 5 -A 20 "legend.*Gap Settings" components/NestingAX/Workspace.tsx
```
It showed:
```
5960: <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Gap Settings</legend>
```
Which is inside the `engine` tab block (starts around line 5909).

So, in the `engine` tab, we have a layout like this:
```jsx
{settingsTab === 'engine' && (
   <div className="flex space-x-4">
      <div className="w-1/2 h-[300px] overflow-y-auto...">
         {/* Pack Direction */}
         {/* Allow Part Rotation */}
         {/* Gap Settings */}
      </div>
      <div className="w-1/2 flex flex-col...">
         {/* SVGs */}
      </div>
   </div>
)}
```

Right now, I placed `renderGapSVG` inside the `<fieldset>` of Gap Settings inside the left column.
This makes the left column awkwardly wide or squeezed.

The user wants me to move `renderGapSVG(appSettings.gaps)` over to the right column, where `renderEngineSVG` and `renderRectEngineSVG` are, stacking them vertically (all in one column).

## Tasks
1. Edit `components/NestingAX/Workspace.tsx`
2. Find the `<fieldset>` with "Gap Settings". Restore its internal layout to a simple single column (remove the grid-cols-2 and the SVG from there).
3. Find the Right Column in the `engine` tab (`{/* SVG Preview Right Column */}`).
4. Add the `renderGapSVG(appSettings.gaps)` into this Right Column stack.
5. Because there are now 3 SVGs, we might need to adjust their heights/padding or add an overflow-y to the right column so it doesn't break the modal height.
