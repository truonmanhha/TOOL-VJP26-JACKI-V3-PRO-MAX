# Plan: NestingAX Fireworks & Utilities Update

## Goal
Implement a massive update to the NestingAX toolset and visual effects:
1.  **Utilities Menu Upgrade**: Add 4 new tools (Join, Radius, Angle, Area) to the "Tiện ích" submenu.
2.  **Fireworks Overhaul**: Replace the simple JS fireworks with a professional-grade Canvas-based fireworks show (overlay).
3.  **Measure Tool Upgrade**: Ensure all measurement tools follow the 2-click / 3-click CAD standard.

## 1. Create Fireworks Component [NEW FILE]
**File:** `components/NestingAX/FireworksOverlay.tsx`
**Action:** Create a new file containing the full Canvas fireworks engine provided by the user.

```tsx
import React, { useEffect, useRef, useState } from 'react';
import './FireworksOverlay.css'; // We will create this too, or use inline styles

interface FireworksProps {
  onClose: () => void;
  duration?: number; // default 20s
}

export const FireworksOverlay: React.FC<FireworksProps> = ({ onClose, duration = 20000 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    // Timer to auto-close
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // --- PASTE THE HUGE JS FIREWORKS ENGINE HERE (converted to React useEffect) ---
    // See "Fireworks Engine Implementation" section below for the adapted code
    
    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fireworks-overlay fixed inset-0 z-[9999] bg-black">
      <div className="absolute top-4 right-4 z-50 text-white font-bold text-xl">
        Closing in {timeLeft}s
        <button onClick={onClose} className="ml-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700">
          Close Now
        </button>
      </div>
      <div ref={containerRef} id="fireworks-stage" className="w-full h-full" />
      {/* SVG Spritesheet from user code */}
      <div style={{ height: 0, width: 0, position: 'absolute', visibility: 'hidden' }}>
        <svg xmlns="http://www.w3.org/2000/svg">
          <symbol id="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></symbol>
          <symbol id="icon-pause" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></symbol>
          <symbol id="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></symbol>
          <symbol id="icon-settings" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5-3.5 1.57 3.5-3.5 3.5z"/></symbol>
          <symbol id="icon-sound-on" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></symbol>
          <symbol id="icon-sound-off" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></symbol>
        </svg>
      </div>
      {/* App Container */}
      <div className="container relative w-full h-full flex justify-center items-center">
        <div className="stage-container w-full h-full overflow-hidden border-none m-0">
          <div className="canvas-container w-full h-full relative transition-[filter] duration-300">
            <canvas id="trails-canvas" className="absolute mix-blend-lighten transform-gpu"></canvas>
            <canvas id="main-canvas" className="absolute mix-blend-lighten transform-gpu"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**File:** `components/NestingAX/FireworksOverlay.css`
**Action:** Create CSS file with content provided by user.

---

## 2. Update RadialMenu Structure [TASK 1]
**File:** `components/NestingAX/RadialMenu.tsx`
**Action:** Update the "Tiện ích" submenu structure.

**FIND (Lines 38-41):**
```tsx
        { name: "Tiện ích", icon: "icon-tool", action: null, color: "#FF9100", sub: [
            { name: "Đo đạc", icon: "icon-measure", action: "measure", color: "#FFAB00" },
            { name: "Ghi chú", icon: "icon-note", action: "note", color: "#FFC400" }
        ] },
```

**REPLACE WITH:**
```tsx
        { name: "Tiện ích", icon: "icon-tool", action: null, color: "#FF9100", sub: [
            { name: "Nối", icon: "icon-join", action: "join", color: "#76FF03" }, // Moved here
            { name: "Đo đạc", icon: "icon-measure", action: "measure", color: "#FFAB00" },
            { name: "Bán kính", icon: "icon-radius", action: "measure_radius", color: "#FFD740" },
            { name: "Góc", icon: "icon-angle", action: "measure_angle", color: "#FFE57F" },
            { name: "Diện tích", icon: "icon-area", action: "measure_area", color: "#FFF8E1" },
            { name: "Ghi chú", icon: "icon-note", action: "note", color: "#FFC400" }
        ] },
```

*Note: Also verify "Pháo Hoa" item at Line 45 exists and has action "fireworks".*

---

## 3. Update Workspace Integration [TASK 2 & 3]
**File:** `components/NestingAX/Workspace.tsx`

### Step 3.1: Add State for New Measures & Fireworks
**Location:** After existing `measureResult` state (around line 180).

```tsx
  // === NEW MEASURE TOOLS STATE ===
  const [measureRadiusPoints, setMeasureRadiusPoints] = useState<{ x: number; y: number }[]>([]); // 3 points for circle
  const [measureAnglePoints, setMeasureAnglePoints] = useState<{ x: number; y: number }[]>([]); // 3 points (center, p1, p2)
  const [measureAreaPoints, setMeasureAreaPoints] = useState<{ x: number; y: number }[]>([]); // polygon points
  
  // === FIREWORKS STATE ===
  const [showFireworksOverlay, setShowFireworksOverlay] = useState(false);
```

### Step 3.2: Update Tool Selection Logic (RadialMenu Callback)
**Location:** Inside `handleSelectTool` (or wherever `setActiveDrawTool` is called). The `RadialMenu` usually calls `onSelectTool`. In `Workspace.tsx`, find where `activeDrawTool` is set from the menu.

**Logic:**
- If action is `fireworks` → `setShowFireworksOverlay(true)`
- If action is `measure_*` → `setActiveDrawTool(action)`

### Step 3.3: Implement New Measure Logic
**Location:** Inside `handleDrawingClick`.

**Add blocks for:**
- `activeDrawTool === 'measure_radius'`: Click 3 points → fit circle → show radius.
- `activeDrawTool === 'measure_angle'`: Click 3 points (Vertex, Start, End) → show angle.
- `activeDrawTool === 'measure_area'`: Click N points → double click or close loop to finish → show area.

### Step 3.4: Render Fireworks Overlay
**Location:** At the very end of the JSX return (before `</div>`).

```tsx
      <AnimatePresence>
        {showFireworksOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
          >
            <FireworksOverlay onClose={() => setShowFireworksOverlay(false)} />
          </motion.div>
        )}
      </AnimatePresence>
```

---

## 4. Execution Sequence
1.  **Create CSS**: `FireworksOverlay.css`
2.  **Create Component**: `FireworksOverlay.tsx` (Heavy lifting here)
3.  **Update RadialMenu**: Add the 4 new items.
4.  **Update Workspace**: Wire up state, handlers, and rendering.

## Risk Assessment
- **High Risk**: The Fireworks JS code is massive and complex. It needs to be carefully adapted to React/TypeScript to avoid memory leaks or `window` object pollution.
- **Medium Risk**: Workspace file is already huge (5600+ lines). Adding more state requires careful placement to avoid breaking existing hooks.

I will now generate the detailed Plan file with the adapted Fireworks code ready for copy-paste.