# Combine SVGs into a single Right Column

## Context
User requested that the newly created "Gap Settings" SVG shouldn't be placed alone next to the Gap inputs, but should be combined with the existing SVG previews ("Mô phỏng hướng xếp" and "Mô phỏng hướng cắt") into a single "all in one" preview column on the right side of the settings panel.

## Plan
1. Look at `components/NestingAX/Workspace.tsx` where `settingsTab === 'engine'` and `settingsTab === 'gaps'`.
2. Wait, the Gap settings are part of the 'gaps' tab right now (or inside the General section).
3. Need to understand exactly where the inputs for Gap are currently located, and adjust the layout so all SVGs (Gap, Engine Pack, RectEngine Guillotine) share a common preview area, OR move the Gap SVG specifically into the existing Engine SVG column if they share a tab.

Let's check `Workspace.tsx` around the 'gaps' setting first.
