# Dynamic Single Preview Window

## Context
User wants only ONE preview window on the right side. Instead of stacking all 3 SVGs vertically, the single preview window should dynamically switch its content based on what the user is currently interacting with.
- If they interact with Pack Direction -> show Pack Direction SVG.
- If they interact with Gap Settings -> show Gap Settings SVG.
- By default, show the last interacted one or a default one.

## Implementation Plan
1. In `Workspace.tsx`, we need a new state to track the active preview: 
   `const [activePreview, setActivePreview] = useState<'packTo' | 'guillotine' | 'gaps'>('packTo');`
2. Update the input fields/buttons in the left column to set this state when focused, clicked, or changed.
   - Pack Direction buttons `onClick` -> `setActivePreview('packTo')`
   - Gap Settings inputs `onFocus` or `onClick` -> `setActivePreview('gaps')`
   - (If applicable in the Engine tab) Guillotine inputs -> `setActivePreview('guillotine')`
3. Update the Right Column to only render the SVG corresponding to `activePreview`.
4. Apply Framer Motion (`<AnimatePresence mode="wait">`) or simple conditional rendering for smooth transitions.
