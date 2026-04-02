# Nesting AX import/canvas rebuild draft

## User-confirmed scope priorities
- Target only `Nesting AX`
- Rebuild import/canvas from A-Z, not patchwork
- Research AutoCAD behavior deeply and use it as the comparison target
- Import fidelity must explicitly cover:
  - block
  - hatch
  - color
  - group
  - text dim
  - dim
  - all dimension parameters

## Required benchmark target
- Study how AutoCAD handles:
  - drawing display semantics
  - DWG/DXF import and internal representation
  - blocks and inserts
  - hatches
  - groups
  - text and text attachment
  - dimensions and dimstyle
  - linetype / lineweight / color
  - annotation scaling and model-space behavior
- Then compare Nesting AX against that target and plan migration toward functionally equivalent behavior.

## Current known direction
- Old runtime still centered in `components/NestingAX/Workspace.tsx`
- New migration path exists under `components/NestingAX/engine/*`
- Need next plan focused on missing import completeness before more UI polish

## User feedback on current plan quality
- Plan still feels insufficiently detailed
- Priority order must be sharper
- Definition of done / completion criteria must be stricter

## Additional directly confirmed missing import/canvas gaps
- Spline import is still effectively missing from current Nesting AX import paths even though the renderer has a spline/polyline branch.
- Leader / MLeader import is still effectively missing while a leader render branch exists in `Workspace.tsx`.
- MTEXT is still largely degraded into plain text semantics rather than a richer text object model.
- Hatch support is still weak at the edge/loop fidelity level; current handling is too shallow for CAD-grade hatch behavior.
- Insert semantics exist in the new engine path, but there is still no true insert renderer in the active canvas path.
- Hatch rendering still depends on legacy `targetEntityId` behavior instead of a proper hatch engine driven from hatch semantics.
- Ellipse fidelity is still incomplete, especially around richer axis/rotation semantics.
- By-layer / by-block style inheritance is still incomplete even though basic color/linetype/lineweight support exists.
- Import diagnostics are still not granular enough by CAD subtype/domain (for example hatch edge types, mtext degradation, unresolved inserts, leader absence).
- Dedicated render modules still do not exist for several important domains: text, hatch, insert, leader, spline.
