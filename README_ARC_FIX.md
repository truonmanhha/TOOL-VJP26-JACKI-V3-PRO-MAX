# Arc Rendering Fix (NestingAX)

## The Issue
When importing DXF files into the Nesting tool, arcs that crossed the 0-degree boundary (e.g., from 300° to 60°) were rendering incorrectly. They appeared as giant C-shapes or nearly full circles because the SVG sweep direction was inverted.

## The Root Cause
In `components/NestingAX/services/dxfService.ts`, the code calculated the midpoint of the arc as:
```typescript
const midA = sa + (ea - sa) / 2;
```
Because DXF arcs are always counter-clockwise, if the arc crossed 0°, `ea` would be less than `sa`. The formula above calculated the *inner* midpoint (on the opposite side of the circle) rather than the *outer* midpoint along the arc path. 

Later, when the canvas rendered the SVG (`Workspace.tsx`), it used this midpoint to calculate a cross-product. Because the midpoint was on the wrong side, the cross-product flipped the `sweep-flag`, causing it to draw the inverse of the arc.

## The Fix
Updated both arc parsing blocks in `dxfService.ts` to properly handle CCW angle wrapping:
```typescript
const arcSpan = ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa);
const midA = sa + arcSpan / 2;
```
This correctly calculates the arc span and finds the true midpoint along the arc path, ensuring the cross-product determines the correct sweep direction.
