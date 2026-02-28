# Arc Rendering Fix Plan

## Objective
Fix the DXF arc rendering bug in the Nesting tool where arcs that cross the 0-degree angle boundary render incorrectly as inverted curves (large C-shapes or full circles).

## Context
- DXF arcs are always parsed as counter-clockwise (CCW).
- When a CCW arc crosses 0 degrees, its end angle (`ea`) is numerically less than its start angle (`sa`).
- The current midpoint calculation (`midA = sa + (ea - sa) / 2`) fails in this case, calculating the *inner* midpoint (on the opposite side of the circle) rather than the correct *outer* midpoint along the arc path.
- The Nesting Workspace SVG renderer uses this midpoint (`p3`) to compute a cross-product, which determines the sweep flag. The incorrect `p3` reverses the sweep, drawing the arc inside-out.

## Scope
**IN:**
- `components/NestingAX/services/dxfService.ts`
- Fix BOTH `case 'ARC':` logic blocks (lines ~105 and ~322)

**OUT:**
- No changes to `Workspace.tsx` renderer (it behaves correctly when fed the right points).
- No changes to `VectorPreview.tsx` or `GCodeViewer.tsx`.
- No new libraries or dependencies.

## Acceptance Criteria
- [x] Arcs that cross the 0-degree boundary (e.g., from 300° to 60°) calculate the correct midpoint and render properly.
- [x] Existing standard arcs (e.g., 0° to 90°) continue to render exactly as before.

## Tasks

### [x] 1. Fix Arc Midpoint Calculation in Main Parser
- **File**: `components/NestingAX/services/dxfService.ts`
- **Action**: Update the first `case 'ARC':` block (around line 105).
- **Details**: 
  Change:
  ```typescript
  const midA = sa + (ea - sa) / 2;
  ```
  To:
  ```typescript
  const arcSpan = ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa);
  const midA = sa + arcSpan / 2;
  ```
- **QA Scenario**: A standard arc (0 to 90 degrees) should have a midpoint of 45 degrees. A crossing arc (300 to 60 degrees) should have an arc span of 120 degrees and a midpoint of 0/360 degrees.

### [x] 2. Fix Arc Midpoint Calculation in Fallback Parser
- **File**: `components/NestingAX/services/dxfService.ts`
- **Action**: Update the second `case 'ARC':` block (around line 322).
- **Details**: 
  Apply the exact same fix as above to the fallback parser block.
  ```typescript
  const arcSpan = ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa);
  const midA = sa + arcSpan / 2;
  ```
- **QA Scenario**: Same as task 1, ensure the fallback parser also processes arcs crossing the 0-degree boundary correctly.

## Final Verification Wave
*This section will be populated with tasks.*
