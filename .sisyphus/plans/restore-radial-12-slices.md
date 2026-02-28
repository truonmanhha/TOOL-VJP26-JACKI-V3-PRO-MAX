# Plan: Restore RadialMenu to 12 Slices + Fireworks Easter Egg

**Status**: 🔴 NOT STARTED  
**Created**: 2026-02-25  
**Files Modified**: 2 (RadialMenu.tsx, NestingAXApp.tsx)  
**Complexity**: Trivial — array insertion + particle function + handler wiring

---

## Context

The RadialMenu originally had 12 pie slices (12 × 30° = 360° full circle). Commit `616ba7e` deleted "Zoom Fit" (1 item), reducing the menu from 12 to 11 items. This leaves a 30° gap in the radial menu circle.

**User request**: Add a "Pháo Hoa" (Fireworks) easter egg button that shoots fireworks when clicked. This restores the menu to 12 items.

### Current MENU_DATA (11 items):
```
Index 0:  "Vẽ (Draw)"      — sub-menu (Draw tools)
Index 1:  "Lớp (Layers)"   — action: layer_panel
Index 2:  "Xóa (Del)"      — action: delete
Index 3:  "Chỉnh sửa"      — sub-menu (Edit tools)
Index 4:  "Tiện ích"        — sub-menu (Utilities)
Index 5:  "Redo"            — action: redo
Index 6:  "Undo"            — action: undo
Index 7:  "Auto Fit"        — action: zoom_fit
Index 8:  "Gia công CAM"    — sub-menu (CAM tools)
Index 9:  "View Tráng"      — action: view_front
Index 10: "View Lưng"       — action: view_back
```

### Target MENU_DATA (12 items):
```
Index 0:  "Vẽ (Draw)"      — sub-menu (Draw tools)
Index 1:  "Lớp (Layers)"   — action: layer_panel
Index 2:  "Xóa (Del)"      — action: delete
Index 3:  "Chỉnh sửa"      — sub-menu (Edit tools)
Index 4:  "Tiện ích"        — sub-menu (Utilities)
Index 5:  "Redo"            — action: redo
Index 6:  "Undo"            — action: undo
Index 7:  "Auto Fit"        — action: zoom_fit
Index 8:  ★ "Pháo Hoa"     — action: fireworks   ← NEW
Index 9:  "Gia công CAM"    — sub-menu (CAM tools)
Index 10: "View Tráng"      — action: view_front
Index 11: "View Lưng"       — action: view_back
```

### Angle math
- Line 224: `const startAngle = i * 30 - 105;`
- 12 items × 30° = 360° = full circle ✓
- No change needed to angle calculation

---

## Constraints
- "Không sửa những gì không liên quan" (Do NOT modify unrelated code)
- Fireworks is purely visual — NO tool state side effect
- Use existing DOM particle pattern (no canvas, no WebGL, no external libs)
- Must NOT touch Workspace.tsx

---

## Task 1: Add "Pháo Hoa" Item + Fireworks Effect + Handler Wiring

**Status**: 🔴 NOT STARTED  
**Files**: `components/NestingAX/RadialMenu.tsx`, `components/NestingAXApp.tsx`  
**Delegation**: `category: "quick"`, `load_skills: ["frontend-ui-ux"]`

### Step 1.1: Insert "Pháo Hoa" into MENU_DATA array

**File**: `components/NestingAX/RadialMenu.tsx`  
**Location**: After line 43 (after "Auto Fit" entry), before "Gia công CAM" entry  

Insert this new array element after the "Auto Fit" line:

```typescript
  { name: "Pháo Hoa", icon: "icon-firework", action: "fireworks", color: "#FF6B35", sub: null },
```

**After edit**, lines 43-45 should look like:
```typescript
  { name: "Auto Fit", icon: "icon-zoom", action: "zoom_fit", color: "#40C4FF", sub: null },
  { name: "Pháo Hoa", icon: "icon-firework", action: "fireworks", color: "#FF6B35", sub: null },
  { name: "Gia công CAM", icon: "icon-cam", action: null, color: "#E040FB", sub: [
```

### Step 1.2: Add `icon-firework` SVG icon definition

**File**: `components/NestingAX/RadialMenu.tsx`  
**Location**: In the `<defs id="static-defs">` section, after line 492 (after `icon-3d`), before `icon-cam`

Insert this SVG icon (a starburst/firework shape):

```tsx
          <g id="icon-firework"><g transform="translate(-12, -12)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" fill="currentColor"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></g></g>
```

This creates a starburst icon with 8 radiating lines from a center dot — visually reads as "firework/sparkle".

### Step 1.3: Create `spawnFireworks` function

**File**: `components/NestingAX/RadialMenu.tsx`  
**Location**: After `spawnParticles` function (after line 129, before line 130's `// ---------------------------------------------------------`)

Add a new `spawnFireworks` callback function:

```typescript
  // ---------------------------------------------------------
  // 2b. PHÁO HOA (FIREWORKS EFFECT)
  // ---------------------------------------------------------
  const spawnFireworks = useCallback((px: number, py: number) => {
    const colors = ['#FF6B35', '#FFD700', '#FF1744', '#00E5FF', '#76FF03', '#E040FB', '#40C4FF', '#FFEA00'];
    const burstCount = 5;
    const particlesPerBurst = 30;

    for (let b = 0; b < burstCount; b++) {
      setTimeout(() => {
        // Randomize burst center slightly
        const cx = px + (Math.random() - 0.5) * 120;
        const cy = py + (Math.random() - 0.5) * 120;
        
        for (let i = 0; i < particlesPerBurst; i++) {
          const p = document.createElement('div');
          const color = colors[Math.floor(Math.random() * colors.length)];
          const size = Math.random() * 8 + 3;
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 180 + 60;
          
          p.style.cssText = `
            position:fixed;border-radius:50%;pointer-events:none;z-index:9999;
            background:${color};box-shadow:0 0 ${size + 4}px ${color};
            left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
            animation:radial-firework-burst ${0.8 + Math.random() * 0.6}s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
          `;
          p.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
          p.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
          document.body.appendChild(p);
          setTimeout(() => p.remove(), 1500);
        }
      }, b * 150);
    }
  }, []);
```

**Spec**: 5 bursts × 30 particles = 150 particles total, staggered 150ms apart. Each burst offset randomly from click center. Particles are 3-11px, travel 60-240px, live 1.5s. 8 vibrant colors with glow (box-shadow). 

### Step 1.4: Add `@keyframes radial-firework-burst` CSS

**File**: `components/NestingAX/RadialMenu.tsx`  
**Location**: In the `RADIAL_MENU_CSS` template string, after the existing `@keyframes radial-particle-burst` block (after line 784, before the closing backtick on line 785)

Insert:

```css

  @keyframes radial-firework-burst {
    0%   { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
    30%  { opacity:1; }
    100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity:0; }
  }
```

This is similar to `radial-particle-burst` but with:
- Starts at scale 1.2 (larger initial)
- Holds opacity at 1.0 through 30% (visible longer)
- Then fades to 0 and shrinks

### Step 1.5: Wire fireworks action in RadialMenu click handler

**File**: `components/NestingAX/RadialMenu.tsx`  
**Location**: In the `g.onclick` handler, around lines 366-373. Currently:

```typescript
      g.onclick = (e) => {
        e.stopPropagation();
        if (item.action && !item.sub) {
          playSound('click');
          spawnParticles(e.pageX, e.pageY, item.color);
          if (onSelectTool) onSelectTool(item.action);
          setTimeout(() => onClose(), 200);
        }
      };
```

**Change**: Add a special case for the `fireworks` action that calls `spawnFireworks` instead of `spawnParticles`, and still dispatches to `onSelectTool`:

```typescript
      g.onclick = (e) => {
        e.stopPropagation();
        if (item.action && !item.sub) {
          playSound('click');
          if (item.action === 'fireworks') {
            spawnFireworks(e.pageX, e.pageY);
          } else {
            spawnParticles(e.pageX, e.pageY, item.color);
          }
          if (onSelectTool) onSelectTool(item.action);
          setTimeout(() => onClose(), 200);
        }
      };
```

**ALSO**: Add `spawnFireworks` to the `useCallback` dependency array on line 381:

```typescript
  }, [playSound, typeWriterEffect, clearCenterText, spawnParticles, spawnFireworks, onSelectTool, onClose]);
```

### Step 1.6: Add `fireworks` case in handleSelectDrawTool

**File**: `components/NestingAXApp.tsx`  
**Location**: In `handleSelectDrawTool` function, after the `layer_panel` case (after line 442), before the "Regular tool selection" comment

Insert:

```typescript
    if (tool === 'fireworks') {
      // Easter egg — purely visual, no tool state change
      return;
    }
```

This intercepts the `fireworks` action and returns early so it does NOT call `setActiveDrawTool('fireworks')` (which would put the workspace in an invalid tool state).

### Acceptance Criteria

1. `MENU_DATA.length === 12` — count items in the array
2. `npx tsc --noEmit` exits with code 0 (no TypeScript errors)
3. `npm run build` completes successfully (under 60s)
4. Hovering "Pháo Hoa" shows typewriter text "PHÁO HOA" in center
5. Clicking "Pháo Hoa" triggers 5-burst fireworks (150 particles, multi-color, glow)
6. After fireworks, RadialMenu closes, NO draw tool is activated
7. All 12 slices are evenly distributed (no gap in the circle)
8. Console log shows `🎨 NestingAXApp: handleSelectDrawTool called with: fireworks` but NOT `Setting activeDrawTool to: fireworks`

---

## Final Verification Wave

**Status**: 🔴 NOT STARTED

After Task 1 is complete:
1. Run `npx tsc --noEmit` — must exit 0
2. Run `npm run build` — must succeed
3. Visual check: Open app → NestingAX → right-click → count 12 pie slices
4. Click "Pháo Hoa" → fireworks burst → menu closes → no tool active
5. Commit with message: `fix(nesting): restore RadialMenu to 12 slices + add Pháo Hoa fireworks easter egg`

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| DOM particle count (150) could lag on slow devices | Particles auto-remove after 1.5s; setTimeout cleanup prevents memory leak |
| `spawnFireworks` not in buildMenu's useCallback deps | Explicitly add to dependency array (Step 1.5) |
| `fireworks` action leaks to setActiveDrawTool | Early return in handleSelectDrawTool (Step 1.6) |
| SVG icon-firework not rendering | Use same transform/structure as all other icons in defs |
