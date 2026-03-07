# Add Dynamic SVG Illustrations for Gap Settings

## Context
User requested animated illustrations for the "Gap Settings" in the NestingAX Workspace panel, similar to how General, Engine, and Rectangular Engine settings already have animated visual SVGs.

## Plan
1. Create a new rendering function `renderGapSVG(gaps: any, rectGaps: any)` in `components/NestingAX/renderSettingsSVG.tsx`.
2. The SVG will visually demonstrate what the Gap numbers mean:
   - `minGapPath`: Space between two nested parts.
   - `sheetEdgeGap`: Space between the parts and the yellow sheet border.
   - `leadInGap`: Space indicating where a tool lead-in might happen.
3. Import and use this function in `components/NestingAX/Workspace.tsx` right next to the Gap Setting inputs.
4. Ensure the visual responds dynamically (or at least looks representative) based on the input values.

## Strategy
- Task 1: Create `renderGapSVG` in `renderSettingsSVG.tsx`
- Task 2: Implement UI layout in `Workspace.tsx` to display this SVG alongside the inputs.
