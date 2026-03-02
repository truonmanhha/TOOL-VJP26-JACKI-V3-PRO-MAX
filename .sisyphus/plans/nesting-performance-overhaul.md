# Work Plan: Nesting Performance Overhaul

## 🎯 Goal
Eliminate UI lag, browser freezes, and input delays during the file import, part interaction, and nesting execution phases of the NestingAX application.

## 🏗️ Technical Approach
1.  **Offloading**: Move CPU-intensive tasks (DXF/DWG parsing, Genetic Algorithm evolution) from the Main Thread to Web Workers.
2.  **Decimation**: Use the Douglas-Peucker algorithm to reduce vertex counts for curves (arcs, circles) during import without sacrificing fidelity.
3.  **Throttling**: Decouple mouse movement events from React state updates and Canvas redraws using `requestAnimationFrame`.
4.  **Batching**: Consolidate fragmented React states in the workspace to prevent cascading re-renders.

## 📦 Scope
- **In-Scope**: `dxfService.ts`, `geneticNesting.ts`, `DrawingWorkspace.tsx`, and `NestingAX/Workspace.tsx`.
- **Out-of-Scope**: Changing the core nesting math or UI design.

## 🧪 Verification Plan
- **Automated**: Verify that parsed geometry remains within 0.1mm tolerance after simplification.
- **Manual**: Test with a "heavy" DXF (10k+ entities) and verify that the UI remains responsive during import and nesting.
- **Performance**: Target 60fps for canvas panning/zooming.

---

## 🛠️ Implementation Tasks

### 1. Web Worker Foundation
- [ ] Create `workers/nesting.worker.ts` to host the `AdvancedNestingEngine`.
- [ ] Update `dxf.worker.ts` to handle full DXF/DWG parsing asynchronously.
- [ ] Implement a standardized `WorkerManager` to handle postMessage communication, progress reporting, and error boundaries.

### 2. File Import Optimization (Worker + Decimation)
- [ ] Modify `dxfService.ts` to delegate parsing to `dxf.worker.ts` for files > 1MB.
- [ ] Integrate `simplifyPolygon` (Douglas-Peucker) into the import pipeline with a default tolerance of 0.1mm.
- [ ] Add progress callbacks to the import UI to show "Parsing... X%" instead of a frozen screen.

### 3. Nesting Execution (Background Threading)
- [ ] Refactor `GeneticNesting.evolve()` to be interruptible and runnable inside a Worker.
- [ ] Implement state synchronization: send part geometries to Worker, receive placement coordinates back in chunks.
- [ ] Ensure the "Performing Nest" modal receives real-time progress updates without blocking the UI.

### 4. UI Interaction (RAF + Throttling)
- [ ] Refactor `DrawingWorkspace.tsx`: Use `useRef` for mouse positions and `requestAnimationFrame` for the canvas render loop.
- [ ] Throttle `setMouseWorldPos` and `setViewOffset` to prevent React state flooding.
- [ ] Memoize expensive geometric calculations (like `getCenter` for arcs) to prevent recalculation on every frame.

### 5. Final Verification Wave
- [ ] **Profile**: Run Chrome DevTools Performance audit on large imports.
- [ ] **Stress Test**: Attempt to cancel a background nesting task mid-computation.
- [ ] **UX Polish**: Ensure no "Not Responding" dialogs appear on lower-end hardware.
