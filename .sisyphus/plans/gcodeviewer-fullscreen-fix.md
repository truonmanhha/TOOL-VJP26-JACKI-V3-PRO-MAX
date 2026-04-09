# GCodeViewer — Fix 3D Preview FullScreen Button + Border Flash Animation

## TL;DR

> **Quick Summary**: Two targeted fixes to `components/GCodeViewer.tsx`:
> 1. The 3D Preview panel's **Full Screen toolbar button** (`toggleFullScreen`) gets smooth scroll + page-lock behavior identical to `handleWorkspaceLock`.
> 2. The **border flash animation** is changed from `absolute` → `fixed` positioning and slowed from `0.8s` → `2.5s` so it fills the full viewport without being clipped.
>
> **Deliverables**:
> - `components/GCodeViewer.tsx` (modified, 2 edits)
>
> **Estimated Effort**: Quick (< 15 min)
> **Parallel Execution**: NO — sequential edits to one file
> **Critical Path**: Edit 1 (toggleFullScreen) → Edit 2 (border flash) → Build check

---

## Context

### Original Request
User wants the Full Screen button on the GCode Preview panel toolbar to:
1. Scroll the page smoothly then lock it (like the Nesting workspace fullscreen button already does).
2. Have a cinematic border flash animation that is slow and fills the full viewport height — not clipped to the container and not too fast.

### Research Findings
- `toggleFullScreen` at **line 1181** currently: `const toggleFullScreen = () => { setIs3DFullScreen(!is3DFullScreen); setTimeout(() => setZoomFitTrigger(p => p + 1), 300); };` — **no scroll, no lock**.
- `handleWorkspaceLock` at **lines 1207–1230** already has the correct `fluidScroll(1200ms)` + `setTimeout lock(1300ms)` + `document.body.style.overflow` pattern — **copy this pattern exactly**.
- `workspaceRef` is available at both call sites (line 1104).
- `fluidScroll` is defined at line 1183 and works correctly.
- Border flash JSX at **lines 1827–1835** uses `absolute` positioning and `0.8s` duration — needs `fixed` + `2.5s`.
- Reference border animation from `NestingAXApp.tsx` uses `fixed` positioning with `duration: 2.5, times: [0, 0.3, 0.6, 1]`.

---

## Work Objectives

### Core Objective
Make the 3D Preview panel's Full Screen button behave exactly like the outer workspace lock button: fluid scroll → viewport lock → cinematic border flash.

### Must Have
- `toggleFullScreen` scrolls to workspace, waits 1300ms, then sets `document.body.style.overflow = 'hidden'` and `setIs3DFullScreen(true)`
- On exit: `document.body.style.overflow = 'auto'`, scroll back to top, `setIs3DFullScreen(false)`
- Border flash uses `fixed` positioning (not `absolute`)
- Border flash total duration is ~`2.5s`
- `showBorderFlash` triggered in `toggleFullScreen` (set true on enter, auto-clear after 2500ms)

### Must NOT Have
- Do NOT touch `handleWorkspaceLock` — it is already working correctly
- Do NOT add any new state variables
- Do NOT change anything in `NestingAXApp.tsx`
- Do NOT modify the `createPortal` render at line 1873

### Guardrails
- This is a surgical 2-edit change. Touch ONLY lines 1181 and lines 1827-1835.
- After edits, run `npx tsc --noEmit` to verify no TypeScript errors.
- Run `npm run build` to confirm clean build.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: YES — dev server + browser check

---

## Execution Strategy

```
Wave 1 (Sequential, single file):
└── Task 1: Rewrite toggleFullScreen + fix border flash in GCodeViewer.tsx [quick]

Wave 2 (After Task 1):
└── Task 2: Build verification [quick]
```

---

## TODOs

- [ ] 1. Rewrite `toggleFullScreen` and fix border flash animation in `GCodeViewer.tsx`

  **What to do**:

  ### Edit A — Replace `toggleFullScreen` (line 1181)

  **Find this exact string** (line 1181):
  ```
  const toggleFullScreen = () => { setIs3DFullScreen(!is3DFullScreen); setTimeout(() => setZoomFitTrigger(p => p + 1), 300); };
  ```

  **Replace with**:
  ```typescript
  const toggleFullScreen = () => {
    setShowBorderFlash(true);
    setTimeout(() => setShowBorderFlash(false), 2500);

    if (!is3DFullScreen) {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const targetY = rect.top + window.pageYOffset;
        const yOffset = -65;
        fluidScroll(targetY + yOffset, 1200);
        setTimeout(() => {
          document.body.style.overflow = 'hidden';
          setIs3DFullScreen(true);
          setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
        }, 1300);
      }
    } else {
      document.body.style.overflow = 'auto';
      fluidScroll(0, 1000);
      setIs3DFullScreen(false);
      setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
    }
  };
  ```

  ### Edit B — Replace border flash JSX block (lines 1827–1835)

  **Find this exact block** (inside `<AnimatePresence>` starting at line 1827):
  ```jsx
  {showBorderFlash && (
    <>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: [0, 1, 0, 0.8, 0], scale: [0.98, 1, 0.99, 1, 1] }} transition={{ duration: 1.5, times: [0, 0.1, 0.2, 0.5, 1], ease: "easeInOut" }} className="absolute inset-0 z-[9999] pointer-events-none shadow-[inset_0_0_150px_rgba(59,130,246,0.5)] border-[8px] border-blue-500 rounded-xl" />
      <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut" }} className="absolute left-0 right-0 top-0 h-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
      <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.15 }} className="absolute left-0 top-0 bottom-0 w-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
      <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.15 }} className="absolute right-0 top-0 bottom-0 w-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
      <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, ease: "circOut", delay: 0.3 }} className="absolute left-0 right-0 bottom-0 h-1 bg-white z-[10000] shadow-[0_0_20px_#fff]" />
    </>
  )}
  ```

  **Replace with** (NestingAXApp-style, `fixed` positioning, `2.5s` duration, cyan laser beams):
  ```jsx
  {showBorderFlash && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0.1, 0] }}
        transition={{ duration: 2.5, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }}
        className="fixed inset-0 bg-cyan-500/10 z-[9998] pointer-events-none"
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut" }}
        className="fixed left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[10000] shadow-[0_0_20px_#22d3ee] pointer-events-none"
        style={{ transformOrigin: 'left' }}
      />
      <motion.div
        initial={{ height: 0, top: 0, opacity: 0 }}
        animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }}
        transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }}
        className="fixed left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen pointer-events-none"
      />
      <motion.div
        initial={{ height: 0, top: 0, opacity: 0 }}
        animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }}
        transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }}
        className="fixed right-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen pointer-events-none"
      />
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut", delay: 0.3 }}
        className="fixed left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[10000] shadow-[0_0_20px_#22d3ee] pointer-events-none"
        style={{ transformOrigin: 'left' }}
      />
    </>
  )}
  ```

  **Must NOT do**:
  - Do not change `handleWorkspaceLock`
  - Do not add new state
  - Do not edit line 1873 (the createPortal)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — single file, two edits
  - **Blocks**: Task 2 (build check)
  - **Blocked By**: None

  **References**:
  - `components/GCodeViewer.tsx:1181` — current `toggleFullScreen` (replace this)
  - `components/GCodeViewer.tsx:1207-1230` — `handleWorkspaceLock` (copy this pattern)
  - `components/GCodeViewer.tsx:1827-1835` — current border flash JSX (replace this)
  - `components/NestingAXApp.tsx` — reference for NestingAX-style border animation (read-only)

  **Acceptance Criteria**:
  - [ ] `toggleFullScreen` no longer uses the old single-line inline form
  - [ ] `toggleFullScreen` calls `setShowBorderFlash(true)` and `setTimeout(() => setShowBorderFlash(false), 2500)`
  - [ ] `toggleFullScreen` calls `fluidScroll(targetY + yOffset, 1200)` when entering fullscreen
  - [ ] `toggleFullScreen` sets `document.body.style.overflow = 'hidden'` after 1300ms
  - [ ] `toggleFullScreen` sets `document.body.style.overflow = 'auto'` when exiting
  - [ ] Border flash divs use `fixed` (not `absolute`) positioning
  - [ ] Border flash total duration is `2.5` (not `0.8`)
  - [ ] `npx tsc --noEmit` → 0 errors

  **QA Scenarios**:

  ```
  Scenario: Enter fullscreen — smooth scroll + lock + animation
    Tool: Bash (dev server must be running) or visual inspection
    Preconditions: Page loaded with a GCode file, not in fullscreen
    Steps:
      1. Click the Maximize button on the 3D preview panel toolbar
      2. Observe: page scrolls smoothly to the panel (over ~1.2s)
      3. After ~1.3s: observe full-screen portal appears (fixed inset-0 z-[9999])
      4. During transition: observe cyan laser border beams sweep from top → sides → bottom (over 2.5s)
      5. Verify: body scroll is locked (document.body.style.overflow === 'hidden')
    Expected Result: Smooth scroll + 2.5s cyan border animation + fullscreen active
    Failure Indicators: Instant jump (no scroll), border animation clipped to container, duration < 1s

  Scenario: Exit fullscreen — unlock + scroll back
    Tool: Bash / visual
    Preconditions: 3D Preview is in fullscreen mode
    Steps:
      1. Click the Minimize button in the fullscreen portal toolbar
      2. Observe: fullscreen closes immediately
      3. Observe: page scrolls back toward top (over ~1s)
      4. Verify: document.body.style.overflow === 'auto'
    Expected Result: Clean exit, page scroll restored, no locked overflow
    Failure Indicators: Page stays locked, overflow still 'hidden' after exit
  ```

  **Commit**: YES
  - Message: `fix(gcode): smooth scroll+lock for preview fullscreen, fix border animation`
  - Files: `components/GCodeViewer.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 2. Build verification

  **What to do**:
  - Run `npx tsc --noEmit` — must return 0 errors
  - Run `npm run build` — must complete successfully

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits with code 0
  - [ ] `npm run build` completes without errors

  **QA Scenarios**:
  ```
  Scenario: Clean TypeScript build
    Tool: Bash
    Steps:
      1. Run: npx tsc --noEmit
    Expected Result: No output (0 errors)
    Evidence: terminal exit code 0

  Scenario: Production build succeeds
    Tool: Bash
    Steps:
      1. Run: npm run build
    Expected Result: "built in Xs" message, no errors
    Evidence: terminal output shows success
  ```

  **Commit**: NO (included with Task 1)

---

## Final Verification Wave

- [ ] F1. Confirm `toggleFullScreen` body has fluidScroll + lock — grep `components/GCodeViewer.tsx` for `fluidScroll` called inside `toggleFullScreen`
- [ ] F2. Confirm border flash uses `fixed` — grep `showBorderFlash` block for `fixed` class (not `absolute`)
- [ ] F3. Confirm duration is `2.5` — grep for `duration: 2.5` in the border flash block
- [ ] F4. `npx tsc --noEmit` → clean

---

## Success Criteria

```bash
npx tsc --noEmit       # Expected: (no output, exit 0)
npm run build          # Expected: ✓ built in Xs
```

### Final Checklist
- [ ] `toggleFullScreen` uses fluidScroll + 1300ms lock delay
- [ ] `document.body.style.overflow = 'hidden'` set on fullscreen enter
- [ ] `document.body.style.overflow = 'auto'` restored on exit
- [ ] Border flash uses `fixed` positioning
- [ ] Border flash duration is `2.5s`
- [ ] Build passes
