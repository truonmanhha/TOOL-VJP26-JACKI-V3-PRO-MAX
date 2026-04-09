# Nesting AX — Domain-by-Domain Completion Plan

## Goal
Complete the Nesting AX CAD system **one domain at a time**, taking each domain close to AutoCAD-grade behavior before moving to the next.

This replaces a broad horizontal roadmap with a **vertical execution model**:
- pick one CAD domain
- complete its import model
- complete its render fidelity
- complete its styling behavior
- complete its interaction/inspection behavior
- validate it with representative files
- then move to the next domain

## Scope
Only `Nesting AX`.

## Execution principle
Do **not** partially improve many domains at once.
Do **finish one domain deeply** before starting the next.

For every domain, completion means all 5 layers are addressed:

1. **Import fidelity**
2. **Scene model fidelity**
3. **Render fidelity**
4. **Style/annotation behavior**
5. **Interaction + diagnostics**

## Domain execution order
This is the recommended order.

1. **Dimensions / text-dim / dimstyle / all dimension parameters**
2. **Text / annotation text behavior**
3. **Blocks / inserts**
4. **Hatch**
5. **Color / linetype / lineweight / layer style**
6. **Groups**
7. **Curved geometry fidelity (bulge / arc / ellipse polish)**
8. **Interaction engine (selection / snap / hit-test)**
9. **Xrefs / unsupported external references handling**
10. **Performance hardening**

---

## Domain 1 — Dimensions

### Objective
Make dimensions behave like a real CAD annotation system, not a visual overlay.

### Must fully cover
- dimension entity import
- text dim behavior
- dim text override
- measured value
- dimension line
- extension lines
- arrows / ticks
- text placement
- text rotation
- text height
- dimstyle reference
- all available dimension parameters currently present in import sources

### Files likely involved
- `components/NestingAX/services/dxfService.ts`
- `components/NestingAX/services/axSceneModel.ts`
- `components/NestingAX/services/axImportAdapter.ts`
- `components/NestingAX/services/axRenderAdapter.ts`
- `components/NestingAX/services/axAnnotationUtils.ts`
- `components/NestingAX/Workspace.tsx`
- new engine files under `components/NestingAX/engine/render/annotations/**`

### Work breakdown
1. Expand dimension model in engine scene types
2. Preserve every dimension-related field from import
3. Create dedicated dimension render module
4. Implement dimstyle-driven layout
5. Implement correct annotation scaling semantics
6. Implement dimension diagnostics for missing/degraded params

### Definition of done for Dimensions
- imported dimensions no longer degrade into generic lines + text
- dim text does not follow the camera like UI overlay
- dimension styles influence layout/render
- all imported dimension parameters are either rendered, preserved, or explicitly marked unsupported
- dimension validation corpus passes

---

## Domain 2 — Text

### Objective
Make text behave like CAD text, not generic SVG labels.

### Must fully cover
- text string
- text height
- text style
- color
- attachment / justification
- rotation
- annotation scaling

### Definition of done for Text
- attachment/justification feels CAD-like
- text height behaves in model-space
- imported text styling survives render
- no hardcoded fallback color/style dominates imported semantics

---

## Domain 3 — Blocks / Inserts

### Objective
Make block-heavy drawings import and display credibly.

### Must fully cover
- block definition registry
- insert/reference entity model
- translation/rotation/scale transform
- nested insert tolerance
- diagnostics when exploding/preserving blocks

### Definition of done for Blocks
- inserts render at correct transform
- block metadata is preserved
- unsupported nested behavior is explicit, not silent

---

## Domain 4 — Hatch

### Objective
Make hatch semantically meaningful rather than decorative fallback.

### Must fully cover
- hatch boundary loops
- pattern metadata
- angle / spacing if available
- fallback strategy when pattern fidelity is limited

### Definition of done for Hatch
- hatch survives import as real hatch data
- boundary loops are preserved
- degraded hatch behavior is explicitly reported

---

## Domain 5 — Color / Linetype / Lineweight / Layer Style

### Objective
Make style fidelity coherent across all render paths.

### Must fully cover
- by-entity color
- by-layer color
- linetype mapping
- lineweight mapping
- visibility / layer-driven style semantics

### Definition of done for Style
- canvas fallback and SVG path show equivalent styling intent
- imported drawings do not collapse into generic white geometry

---

## Domain 6 — Groups

### Objective
Handle grouping semantics explicitly instead of losing them in import.

### Must fully cover
- preserve group metadata if source provides it
- otherwise explicitly flatten and report that flattening occurred
- selection strategy for grouped content

### Definition of done for Groups
- grouping is either represented or explicitly degraded with diagnostics

---

## Domain 7 — Curved Geometry Polish

### Objective
Finalize geometry fidelity for curves after the domain-heavy annotation/block/hatch work.

### Must fully cover
- bulge-based segments
- arc fidelity
- ellipse fidelity

### Definition of done for Curved Geometry
- curves no longer look faceted or guessed in normal cases

---

## Domain 8 — Interaction Engine

### Objective
Make interaction trustworthy once domains are semantically correct.

### Must fully cover
- hit-test
- selection
- snapping
- grip behavior

### Definition of done for Interaction
- imported CAD entities can be selected/snapped in ways consistent with their semantic geometry

---

## Domain 9 — Xrefs

### Objective
Handle external references explicitly.

### Definition of done for Xrefs
- supported behavior is implemented
- unsupported xrefs are clearly surfaced in diagnostics/UI

---

## Domain 10 — Performance

### Objective
Make the rebuilt fidelity usable on large drawings.

### Definition of done for Performance
- representative heavy files remain navigable after fidelity upgrades

---

## Absolute priority rules
If time is limited, complete domains in this order:

1. Dimensions
2. Text
3. Blocks
4. Hatch
5. Style fidelity

This is the highest-value path toward feeling like CAD.

## Validation rule per domain
Each domain must have:
- representative DXF sample
- representative DWG sample
- import diagnostics check
- render fidelity check
- style/annotation check
- interaction check if relevant

Do not mark a domain complete unless all of the above are reviewed.

## Global definition of done
The whole Nesting AX rebuild is complete only when:
- all core domains above are individually complete
- `AXEngineDocument` is the real source of truth
- legacy `Workspace.tsx` is no longer the primary CAD logic owner
- import loss is explicit everywhere
- representative CAD files across all domains pass validation
