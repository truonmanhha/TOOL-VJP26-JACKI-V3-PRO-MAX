- GCodeViewer is massive and has multiple internal state dependencies.
- Extracted logic required careful porting of `travelDist` subtraction loop and zero-feed fallbacks.
- FIXED: `advanceMotion` crashed when `commands` array was empty because `commands.length - 1` evaluated to `-1`, which caused `commands[-1]` dereferencing. Added guard clause to return safe `MotionResult` with `isFinished: true` when `commands` is empty.
- FIXED: `travelDist === 0` logic in `advanceMotion` now checks if `tempProgress > 0`. If so, it properly interpolates the position along the current segment instead of snapping back to the segment's start point, maintaining 100% motion parity with the realtime viewer.

## 2026-03-09 — F1 audit output file naming
- Plan-required output path is `.sisyphus/evidence/task-f1-audit.txt` (lowercase `f1`).
- A similarly named file `.sisyphus/evidence/task-F1-audit.txt` may exist; ensure consumers read the lowercase file.
