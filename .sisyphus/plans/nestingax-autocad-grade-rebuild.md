# Nesting AX — AutoCAD-Grade Import/Canvas Rebuild Plan

## Goal
Rebuild the **Nesting AX** import, scene, render, annotation, and interaction stack from A–Z so that imported CAD drawings behave much closer to a real CAD system.

This plan targets **functionally equivalent CAD behavior** for the Nesting AX tab only. It does **not** aim to replicate proprietary AutoCAD internals or binary DWG semantics exactly where parser/tooling limits make that unrealistic.

## Scope

### In scope
- `components/NestingAXApp.tsx`
- `components/NestingAX/Workspace.tsx`
- `components/NestingAX/services/dxfService.ts`
- `components/NestingAX/services/ax*.ts`
- `components/NestingAX/engine/**`
- DXF/DWG import fidelity for:
  - blocks / inserts
  - hatches
  - colors
  - groups
  - text
  - dimensions
  - dimension styles and dimension parameters
  - line type / line weight
  - annotation behavior
  - geometry fidelity including bulge-based polylines

### Out of scope
- Non-Nesting-AX tabs
- Full AutoCAD command parity
- Full DWG authoring/editing parity
- Perfect parity with proprietary AutoCAD render heuristics
- CAM, nesting algorithms, and non-canvas business logic unless directly blocked by import/render architecture

## Repo-grounded current state
- The legacy runtime is still centered in `components/NestingAX/Workspace.tsx` and `components/NestingAX/services/dxfService.ts`.
- A parallel migration foundation already exists under:
  - `components/NestingAX/services/axSceneModel.ts`
  - `components/NestingAX/services/axImportAdapter.ts`
  - `components/NestingAX/services/axRenderAdapter.ts`
  - `components/NestingAX/services/axViewportUtils.ts`
  - `components/NestingAX/services/axAnnotationUtils.ts`
  - `components/NestingAX/services/axLineStyleUtils.ts`
  - `components/NestingAX/services/axBulgeUtils.ts`
  - `components/NestingAX/engine/**`
- The import flow now preserves a normalized `AXDrawingDocument` in parallel with the legacy `CadEntity[]` path.
- CAD fidelity remains incomplete because rendering, interaction, and annotation logic are still largely embedded in `Workspace.tsx`.

## Critical guardrails
1. **Do not continue feature growth inside legacy `Workspace.tsx` except for migration adapters or safety fixes.**
2. **All new functionality must land under `components/NestingAX/engine/**` or shared `services/ax*.ts`.**
3. **`AXEngineDocument` becomes the long-term source of truth.** Legacy `CadEntity[]` is transitional only.
4. **Do not silently drop unsupported entities or metadata.** Every import path must produce diagnostics.
5. **Blocks, hatches, text, dimensions, groups, and color are first-class acceptance domains.**
6. **Renderer migration must remain parallel until the new path can replace the old path without breaking the tab.**
7. **Exact AutoCAD parity is not the metric; functional CAD-grade behavior is.**

## Acceptance domains
The rebuild is not considered complete unless all of the following behave credibly inside Nesting AX:
- Block definitions and inserts
- Hatch boundaries and pattern metadata
- Entity and layer color fidelity
- Group preservation or explicit decomposition strategy
- Text attachment / rotation / height / color / style
- Dimensions
- Dimension text
- Full dimension parameters (value, text override, text height, rotation, dimension style, attachment-like placement behavior, extension behavior, arrow behavior, scaling semantics)

## Priority order (absolute execution priority)
This is the required implementation order. Do not reorder unless a lower item is blocking a higher item.

1. **Import truth and diagnostics**
   - If import is incomplete or silent, nothing else is trustworthy.
2. **Geometry fidelity**
   - Wrong geometry makes every later renderer/interactions step meaningless.
3. **Annotation fidelity**
   - Text/dim quality is the next highest CAD-perception factor.
4. **Visual style fidelity**
   - Color / linetype / lineweight must follow semantic geometry and annotation.
5. **Interaction fidelity**
   - Hit-test, selection, snap only matter once the scene is semantically correct.
6. **Blocks / groups / hatches / xrefs deep support**
   - These are crucial, but must land on top of a stable scene/import base.
7. **Performance hardening**
   - Performance optimization happens after correctness, not before.

## Definition of done (global)
The rebuild is only globally complete when all of the following are true:

1. **Single source of truth**
   - `AXEngineDocument` is the authoritative runtime scene for Nesting AX imports.
   - Legacy `CadEntity[]` is no longer the primary scene model.

2. **Import completeness visibility**
   - Every DXF/DWG import reports imported/degraded/skipped/unsupported content.
   - No silent metadata or entity loss remains in the active import path.

3. **Geometry fidelity**
   - Arcs, ellipses, bulge-polylines, circles, inserts, hatches, and blocks render from semantic geometry, not guessed approximations.

4. **Annotation fidelity**
   - Text, text-dim, dimensions, dimension text, and dimension parameters behave in a CAD-grade way in model/view transforms.

5. **Style fidelity**
   - Color, linetype, lineweight, visibility, and style semantics survive both SVG and canvas fallback paths.

6. **Interaction fidelity**
   - Selection, hit-test, and snapping work against semantic geometry for imported files.

7. **Migration completion**
   - `Workspace.tsx` no longer contains the primary CAD engine logic; it only hosts engine-driven render/interaction layers.

8. **Validation corpus passes**
   - The agreed representative DXF/DWG validation set passes milestone acceptance checks.

## Milestone sequence

### Milestone 1 — Freeze legacy path and establish the new engine boundary
**Objective**: Stop deepening the old architecture and formally establish the new runtime boundary.

**Implementation**
- Keep `NestingAXApp.tsx` as the host shell.
- Keep legacy `Workspace.tsx` alive only as a transition host.
- Route all new logic into:
  - `engine/scene`
  - `engine/import`
  - `engine/render`
  - `engine/interaction`
- Introduce one AX engine entry contract used by the Nesting AX tab.

**Deliverables**
- New engine folder structure exists and is wired into the app.
- Legacy runtime still works but is no longer the place for new CAD behavior.
- A migration boundary document exists inside code comments/module names, making it obvious where new logic belongs.

**Success criteria**
- New engine document exists in runtime state.
- No new CAD logic needs to be added directly to legacy `Workspace.tsx`.
- Every new CAD feature task can name its engine destination before implementation.

---

### Milestone 2 — Canonical scene graph and import truth
**Objective**: Make a normalized CAD scene the canonical representation for imported drawings.

**Implementation**
- Expand `AXEngineDocument` / scene graph to fully cover:
  - line
  - arc
  - circle
  - ellipse
  - polyline with bulges
  - text
  - dimension
  - hatch
  - insert
  - block definition
  - group metadata
  - layer records
- Remove ambiguous `points + properties` reliance from the new engine path.

**Files**
- `components/NestingAX/engine/scene/types.ts`
- `components/NestingAX/services/axSceneModel.ts`
- `components/NestingAX/services/axImportAdapter.ts`

**Success criteria**
- Every supported imported entity type maps into a typed engine entity.
- Unsupported or degraded entities are explicit in diagnostics.
- Group semantics have an explicit representation strategy (preserve vs flatten vs warn).
- Dimension parameters are stored in typed structures, not hidden only in generic metadata.

---

### Milestone 3 — Full import pipeline separation
**Objective**: Split import into explicit stages and make DXF/DWG behavior observable and reliable.

**Implementation**
- Split import into:
  1. file loader
  2. parser adapter
  3. normalizer
  4. diagnostics builder
- Strengthen DWG path with layered fallback:
  - backend parse
  - local fallback
  - merge/degradation strategy
- Add import completeness reporting by category.

**Files**
- `components/NestingAX/services/dxfService.ts`
- `components/NestingAX/engine/import/buildDocument.ts`
- new import-specific engine modules as needed

**Success criteria**
- DXF and DWG imports produce deterministic diagnostics.
- Missing data is never silent.
- The import path explicitly reports unsupported or degraded content for:
  - block
  - hatch
  - group
  - text
  - dim
  - dimension parameters
- Backend-vs-local DWG parse differences are surfaced in diagnostics, not hidden.
- Each import stage can be tested independently.

---

### Milestone 4 — Geometry fidelity engine
**Objective**: Make imported geometry render like CAD geometry, not web approximations.

**Implementation**
- Proper arc geometry preservation and rendering
- Proper bulge polyline preservation and rendering
- Proper ellipse axis/rotation semantics
- Proper insert transform handling
- Hatch loop geometry normalization

**Files**
- `components/NestingAX/services/axBulgeUtils.ts`
- `components/NestingAX/services/axRenderAdapter.ts`
- new engine geometry helpers under `engine/render`

**Success criteria**
- Bulged polylines no longer flatten into naive straight segments.
- Arc and ellipse rendering are based on semantic geometry, not ad-hoc point guesses.
- Block insert transforms are mathematically correct for translation/rotation/scale.
- Hatch loop geometry survives normalization in a reusable form.

---

### Milestone 5 — CAD-style renderer replacement
**Objective**: Replace the mixed legacy render path with layered rendering architecture.

**Implementation**
- Introduce explicit layers:
  - geometry layer
  - annotation layer
  - overlay layer
  - interaction preview layer
- Move legacy render branches out of `Workspace.tsx` into engine render modules.
- Keep canvas and SVG cooperation intentional instead of accidental.

**Files**
- `components/NestingAX/engine/render/**`
- `components/NestingAX/Workspace.tsx`

**Success criteria**
- `Workspace.tsx` becomes an orchestration shell, not the primary render engine.
- Geometry and annotation rendering are controlled by engine modules.
- Canvas fallback and SVG overlay render the same semantic style decisions.

---

### Milestone 6 — Annotation engine (text / dim / leader / dimstyle)
**Objective**: Make annotations behave like CAD annotations, not UI overlays.

**Implementation**
- Build an annotation layout engine that handles:
  - text attachment/justification
  - text height
  - text style
  - text rotation
  - dimension text placement
  - extension lines
  - arrowheads
  - dimstyle parameters
  - annotation scaling semantics
- Replace remaining hardcoded annotation decisions.

**Files**
- `components/NestingAX/services/axAnnotationUtils.ts`
- new engine annotation modules under `engine/render`

**Success criteria**
- Text and dim no longer feel like screen-space overlays.
- Dimension behavior reflects imported dimension semantics credibly.
- Full dimension parameter support is represented and rendered.
- Text attachment/justification and text height survive import-to-render without arbitrary fallback loss.

---

### Milestone 7 — CAD visual style engine
**Objective**: Preserve drawing style fidelity across both SVG and canvas paths.

**Implementation**
- Color by entity and by layer rules
- Linetype pattern fidelity
- Lineweight mapping
- Visibility/locked/frozen semantics where relevant to AX
- Ensure large-scene canvas fallback does not degrade style information

**Files**
- `components/NestingAX/services/axLineStyleUtils.ts`
- engine render modules

**Success criteria**
- Large drawings still preserve line style semantics.
- Imported entities no longer revert to generic fallback styling in heavy scenes.
- Annotation colors/styles also follow entity/layer semantics consistently.

---

### Milestone 8 — Interaction and hit-test engine
**Objective**: Make selection, snapping, and editing feel CAD-like.

**Implementation**
- Dedicated hit-test engine for:
  - line
  - arc
  - bulged polyline
  - text
  - dim
  - hatch boundary
- Dedicated selection model
- Dedicated snap engine
- Interaction rendering separated from geometry rendering

**Files**
- `components/NestingAX/engine/interaction/**`
- `components/NestingAX/services/snapService.ts` (transition compatibility)

**Success criteria**
- Selection precision improves on imported CAD geometry.
- Snap behavior works against semantic geometry instead of weak screen heuristics.
- Block/hatch/dimension entities are selectable and inspectable in a CAD-grade way.

---

### Milestone 9 — Blocks, groups, hatches, xrefs
**Objective**: Make real-world CAD drawings with higher structural complexity import and display credibly.

**Implementation**
- Block registry and block-reference render path
- Group representation or explicit flattening strategy
- Hatch fidelity improvement beyond placeholder geometry
- Xref strategy:
  - represent
  - warn
  - degrade safely

**Files**
- engine import/render modules
- `dxfService.ts` transition compatibility path

**Success criteria**
- Block-heavy files do not collapse into unusable geometry.
- Group semantics are either preserved or explicitly surfaced as degraded.
- Hatch no longer behaves like decorative fallback only.
- Xref unsupported states are explicit and non-silent.

---

### Milestone 10 — Performance hardening
**Objective**: Make CAD-grade fidelity usable on larger files.

**Implementation**
- spatial indexing
- cached bounds
- geometry/render caching
- dirty-region redraw strategy
- worker offload for normalization and heavy prep

**Files**
- engine render/interaction/perf modules

**Success criteria**
- Large drawings remain navigable.
- Fidelity improvements do not destroy interaction performance.
- Validation corpus includes at least one large DWG and one large hatch/block-heavy file.

## Milestone-by-milestone exit criteria

### Milestone 1 is done when
- Engine namespace exists and is wired
- No new CAD feature work is added to legacy-only paths

### Milestone 2 is done when
- Typed scene graph covers required entity families
- Groups and dimension parameters have explicit typed representation strategy

### Milestone 3 is done when
- Import stages are separated
- Diagnostics clearly differentiate imported vs degraded vs skipped vs unsupported

### Milestone 4 is done when
- Curved geometry and insert transforms render from semantic data

### Milestone 5 is done when
- Legacy renderer is no longer the primary source of geometry/annotation rendering behavior

### Milestone 6 is done when
- Text and dimensions are CAD-grade enough to stop feeling like overlay labels

### Milestone 7 is done when
- Line and annotation style semantics match imported data in both render paths

### Milestone 8 is done when
- Selection/snap behavior is trustworthy on imported CAD geometry

### Milestone 9 is done when
- Blocks/groups/hatches/xrefs no longer represent the major import completeness gap

### Milestone 10 is done when
- Representative heavy files remain usable without major interaction collapse

## Validation strategy

### Validation wave after every milestone
1. Type diagnostics clean in all touched files
2. Import DXF validation file set
3. Import DWG validation file set
4. Manual comparison checklist against CAD expectations:
   - geometry shape
   - line style
   - text placement
   - dimension behavior
   - hatch fidelity
   - block/inserts
   - color fidelity
5. Record known degradations explicitly

### Required validation corpus
Create or assemble representative test drawings for:
- simple line/polyline
- bulge polyline
- text attachment variants
- dimension variants
- dimstyle variations
- block + nested insert
- hatch-heavy sample
- color/linetype/lineweight sample
- grouped entities sample
- large DWG stress sample

## Hidden risks and mitigation

### Risk: trying to replicate proprietary AutoCAD behavior exactly
**Mitigation**: target functionally equivalent behavior, not binary/internal parity.

### Risk: continuing to mutate `Workspace.tsx` indefinitely
**Mitigation**: every new capability must land in engine modules first.

### Risk: import fidelity improves but render path still degrades semantics
**Mitigation**: treat scene graph and renderer milestones as inseparable.

### Risk: DWG parser limitations block exact parity
**Mitigation**: degrade explicitly, preserve diagnostics, prefer layered fallback.

### Risk: scope creep into non-AX tabs
**Mitigation**: keep all work under `components/NestingAX*` and AX engine/services paths only.

## Execution order
1. Milestone 1 — Engine boundary
2. Milestone 2 — Scene graph truth
3. Milestone 3 — Import pipeline separation
4. Milestone 4 — Geometry fidelity
5. Milestone 5 — Renderer replacement
6. Milestone 6 — Annotation engine
7. Milestone 7 — CAD visual style engine
8. Milestone 8 — Interaction engine
9. Milestone 9 — Blocks/groups/hatches/xrefs
10. Milestone 10 — Performance hardening

## Immediate next implementation target
Begin with **Milestone 2 + 3 hardening** and then move directly into **Milestone 4**. The highest-value path from current partial rebuild state is:

1. finish making the engine document the source of truth
2. complete import completeness and diagnostics
3. improve geometry fidelity for curved and structured content

This sequence maximizes correctness before deeper UI/interaction work.

## Final completion standard
The rebuild is only considered complete when Nesting AX can import and display representative DXF/DWG files with credible CAD-like behavior across:
- block
- hatch
- color
- group
- text dim
- dim
- all dimension parameters

and when all known degradations are explicit, intentional, and documented.
