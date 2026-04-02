# Nesting AX — Remaining Tasks

## Major unfinished domains
- Complete MTEXT engine behavior end-to-end
- Complete LEADER / MLEADER engine behavior end-to-end
- Complete HATCH domain end-to-end
- Complete DXF engine end-to-end
- Complete DWG engine end-to-end
- Clean up legacy Workspace deeply and remove more primary CAD logic from it
- Finish CAD display engine composition and coverage
- Make GROUP engine functional beyond scaffolding
- Make XREF engine functional beyond scaffolding
- Make performance engine practical (not just scaffolding)
- Make migration controller practical for old/new runtime cutover
- Turn validation corpus scaffolding into real executable sample validation flow
- Verify and enforce final global completion checks
- Document all remaining known degradations explicitly

## Checklist items still not fully complete

### Foundation
- Import pipeline separation (loader / parser / normalizer / diagnostics) — partial
- DXF engine completion — partial
- DWG engine completion — partial
- Validation corpus (real DXF/DWG sample set) — partial

### DIM
- DIM domain complete — not complete
- dimstyle behavior — partial
- DIM validation files pass — not complete

### TEXT
- TEXT domain complete — not complete
- text style fidelity — partial
- TEXT validation files pass — not complete

### BLOCK / INSERT
- BLOCK / INSERT domain complete — not complete
- block definition registry — partial
- nested insert strategy — partial
- BLOCK validation files pass — not complete

### HATCH
- HATCH domain complete — not complete
- hatch loop fidelity — partial
- hatch pattern metadata — partial
- hatch render fidelity — partial
- HATCH validation files pass — not complete

### Display correctness
- CAD Display Engine complete — not complete
- Visual Style Engine complete — not complete
- by-layer color — partial
- Curved geometry polish — partial
- spline import/render — partial
- ellipse fidelity — partial

### Interaction and advanced semantics
- Interaction Engine complete — partial
- GROUP engine — partial
- XREF engine — partial

### Finalization
- Migration controller — partial
- Performance engine — partial
- Export/import symmetry hardening — not complete

### Global completion checks
- AXEngineDocument is the real runtime source of truth — partial
- Legacy Workspace is no longer the primary CAD logic owner — not complete
- No silent import loss remains — not complete
- Representative DXF/DWG files display credibly on canvas — not complete
- Known degradations are explicit and documented — partial
