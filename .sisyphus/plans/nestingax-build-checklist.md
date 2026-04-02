# Nesting AX — Build Checklist

## Phase 1 — Foundation (must do first)
- [x] Core Drawing Database engine
- [x] Object Graph Engine
- [~] Import pipeline separation (loader / parser / normalizer / diagnostics)
- [~] DXF engine completion
- [~] DWG engine completion
- [~] Validation corpus (real DXF/DWG sample set)

## Phase 2 — Highest-value CAD domains
- [ ] DIM domain complete
  - [x] full DIM import fidelity
  - [x] full DIM model fidelity
  - [x] full DIM render/layout fidelity
  - [~] dimstyle behavior
  - [x] DIM diagnostics
  - [ ] DIM validation files pass
- [ ] TEXT domain complete
  - [x] text import fidelity
  - [x] attachment / justification
  - [~] text style fidelity
  - [x] model-space text behavior
  - [x] TEXT diagnostics
  - [ ] TEXT validation files pass
- [ ] BLOCK / INSERT domain complete
  - [~] block definition registry
  - [x] insert semantics
  - [~] nested insert strategy
  - [x] preserve vs explode policy
  - [x] BLOCK diagnostics
  - [ ] BLOCK validation files pass
- [ ] HATCH domain complete
  - [~] hatch loop fidelity
  - [~] hatch pattern metadata
  - [~] hatch render fidelity
  - [x] HATCH diagnostics
  - [ ] HATCH validation files pass

## Phase 3 — Display correctness
- [ ] CAD Display Engine complete
- [ ] Visual Style Engine complete
  - [~] by-layer color
  - [x] by-block style behavior
  - [x] linetype fidelity
  - [x] lineweight fidelity
- [ ] Curved geometry polish
  - [~] spline import/render
  - [x] bulge polish
  - [~] ellipse fidelity
- [x] Insert renderer true path
- [x] Hatch renderer true path
- [x] Granular diagnostics per domain/subtype

## Phase 4 — Interaction and advanced semantics
- [~] Interaction Engine complete
  - [x] semantic hit-test
  - [x] semantic snap
  - [x] semantic selection
  - [x] grip behavior
- [~] GROUP engine
- [~] XREF engine

## Phase 5 — Finalization
- [~] Migration controller (old/new runtime boundary cleanup)
- [~] Performance engine
  - [x] spatial index
  - [x] render cache
  - [x] dirty redraw
  - [x] workerized heavy processing
- [ ] Export/import symmetry hardening

## Global completion check
- [~] AXEngineDocument is the real runtime source of truth
- [ ] Legacy Workspace is no longer the primary CAD logic owner
- [ ] No silent import loss remains
- [ ] Representative DXF/DWG files display credibly on canvas
- [~] Known degradations are explicit and documented

## Legend
- [x] completed
- [~] partial / in progress
- [ ] not done
