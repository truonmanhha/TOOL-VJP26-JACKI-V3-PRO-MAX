# 🎨 NEW NEST LIST - VISUAL GUIDE

## 🖼️ UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 NEW NEST LIST                                         [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔧 PANEL 1: TOOLS                                               │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│  │ 📄 Add Part      │ │ 📋 Add Sheet     │ │ ⚙️ Settings      ││
│  └──────────────────┘ └──────────────────┘ └──────────────────┘│
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  📝 PANEL 2: PART LIST                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Name      │ Size     │ Qty │ Priority │ Symmetry │ Rotation ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Part A    │ 100x200  │ 10  │    3     │   None   │   Any   ││
│  │ Part B    │ 150x300  │  5  │    1     │  Horiz   │   90°   ││
│  │ Part C    │  80x120  │ 20  │    5     │  Both    │  None   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  📄 PANEL 3: SHEET LIST                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Material    │ Size        │ Thickness │ Qty                 ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ MDF 18mm    │ 2440x1220   │    18     │  3                  ││
│  │ Plywood 12  │ 2440x1220   │    12     │  2                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  🎬 PANEL 4: ACTIONS                                             │
│                            ┌──────────┐  ┌──────────────────┐   │
│                            │  Close   │  │  🚀 Run Nesting  │   │
│                            └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Workflow Visual

```
START
  │
  ├─► Click "NEW NEST LIST" button
  │        │
  │        ▼
  │   Modal Opens
  │        │
  │        ├─► Click "Add Part From Drawing"
  │        │        │
  │        │        ├─► Modal hides
  │        │        ├─► Enter selection mode (cursor: +)
  │        │        ├─► Select objects (green dashed border)
  │        │        ├─► Press Enter
  │        │        ├─► Part Parameters Dialog opens
  │        │        │        │
  │        │        │        ├─► Fill name, qty, priority, etc.
  │        │        │        └─► Click OK
  │        │        │
  │        │        └─► Part added to list
  │        │
  │        ├─► Click "Add Sheet From Drawing"
  │        │        │
  │        │        └─► Similar to Add Part
  │        │
  │        ├─► Click "Settings"
  │        │        │
  │        │        ├─► Advanced Settings Dialog opens
  │        │        │        │
  │        │        │        ├─► Tab 1: General
  │        │        │        ├─► Tab 2: Strategy
  │        │        │        └─► Tab 3: Extensions
  │        │        │
  │        │        └─► Click Save
  │        │
  │        └─► Click "Run Nesting"
  │                 │
  │                 ├─► Progress overlay shown
  │                 ├─► Send data to backend
  │                 ├─► Backend calculates
  │                 ├─► Receive result
  │                 └─► Draw on canvas
  │
  └─► DONE ✅
```

---

## 🏗️ Architecture Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               NewNestListModal (Main)                     │  │
│  │                                                             │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ ToolsPanel │  │ PartList   │  │ MaterialList       │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              ActionsPanel                           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Dialogs (PartParams, Settings)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              nestingApiClient.ts                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                         HTTP Request
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      BACKEND (Python + FastAPI)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    API Endpoints                           │  │
│  │    GET /         → Health Check                            │  │
│  │    POST /api/nesting/calculate → Full nesting             │  │
│  │    POST /api/nesting/preview   → Quick preview            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Nesting Algorithms                            │  │
│  │    - Rectangular Bin Packing                               │  │
│  │    - Vero-like Heuristic                                   │  │
│  │    - Geometry Utilities                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Return Result                              │  │
│  │    - Placements (position + rotation)                      │  │
│  │    - Utilization %                                         │  │
│  │    - Sheets used                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Visual

```
USER INPUT
    │
    ├─► Select Parts on Canvas
    │   └─► Geometry Data
    │
    ├─► Select Sheets on Canvas
    │   └─► Sheet Dimensions
    │
    └─► Configure Settings
        └─► Algorithm, Spacing, etc.

        ↓ (All Combined)

┌──────────────────────┐
│   Frontend State     │
│  ─────────────────   │
│  - parts: []         │
│  - sheets: []        │
│  - settings: {}      │
└──────────────────────┘
        │
        ▼ (Click "Run Nesting")

┌──────────────────────┐
│ nestingApiClient.ts  │
│  ─────────────────   │
│  Convert to API      │
│  format              │
└──────────────────────┘
        │
        ▼ (HTTP POST)

┌──────────────────────┐
│   Backend API        │
│  ─────────────────   │
│  Validate input      │
│  Run algorithm       │
│  Calculate result    │
└──────────────────────┘
        │
        ▼ (Return JSON)

┌──────────────────────┐
│   Result             │
│  ─────────────────   │
│  - placements        │
│  - utilization: 85%  │
│  - sheets_used: 2    │
└──────────────────────┘
        │
        ▼ (Display)

    CANVAS
    Shows optimized
    layout
```

---

## 🎨 Settings Dialog Visual

```
┌─────────────────────────────────────────────────────┐
│  ⚙️ Advanced Settings                         [X]   │
├─────────────────────────────────────────────────────┤
│  [General] [Strategy] [Extensions]                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Tab: General                                        │
│  ────────────                                        │
│                                                      │
│  Algorithm:                                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⦿ Vero (Recommended)                         │   │
│  │ ○ Rectangular                                │   │
│  │ ○ True Shape                                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Object Type:                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⦿ Geometry                                   │   │
│  │ ○ Toolpath                                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Spacing (mm):  [  5.0  ]                           │
│  Margin (mm):   [ 10.0  ]                           │
│                                                      │
├─────────────────────────────────────────────────────┤
│                          [Cancel]  [Save]           │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 State Management Visual

```
┌──────────────────────────────────────────────────────┐
│              NewNestListModal State                  │
└──────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌───────┐      ┌────────┐     ┌─────────┐
│ parts │      │ sheets │     │ settings│
│  []   │      │   []   │     │   {}    │
└───────┘      └────────┘     └─────────┘
    │               │               │
    ▼               ▼               ▼
┌────────────────────────────────────────┐
│            Actions                     │
│  ─────────────────────────────         │
│  - Add Part    → setParts()            │
│  - Update Part → setParts()            │
│  - Delete Part → setParts()            │
│  - Add Sheet   → setSheets()           │
│  - Update Settings → setSettings()     │
│  - Run Nesting → API Call              │
└────────────────────────────────────────┘
```

---

## 🎯 Component Tree Visual

```
App
 └─ NestingTool
     └─ [Button: "NEW NEST LIST"]
         │
         └─ NewNestListModal (isOpen)
             │
             ├─ Header
             │   ├─ Icon
             │   ├─ Title
             │   └─ Close Button
             │
             ├─ Content Grid (4 panels)
             │   │
             │   ├─ Panel 1: ToolsPanel
             │   │   ├─ Button: Add Part
             │   │   ├─ Button: Add Sheet
             │   │   └─ Button: Settings
             │   │
             │   ├─ Panel 2: PartListGrid
             │   │   └─ Table
             │   │       ├─ Header Row
             │   │       └─ Data Rows (map parts)
             │   │           └─ Editable Cells
             │   │
             │   ├─ Panel 3: MaterialListGrid
             │   │   └─ Table
             │   │       ├─ Header Row
             │   │       └─ Data Rows (map sheets)
             │   │           └─ Editable Cells
             │   │
             │   └─ Panel 4: ActionsPanel
             │       ├─ Button: Close
             │       └─ Button: Run Nesting
             │
             ├─ Progress Overlay (conditional)
             │   └─ Progress Bar
             │
             └─ Dialogs (conditional)
                 ├─ PartParametersDialog
                 │   ├─ Preview
                 │   ├─ Form Fields
                 │   └─ Action Buttons
                 │
                 └─ AdvancedSettingsDialog
                     ├─ Tabs
                     │   ├─ General
                     │   ├─ Strategy
                     │   └─ Extensions
                     └─ Action Buttons
```

---

## 🎨 Color Scheme

```css
/* Primary Colors */
Background:      #111827  (gray-900)
Surface:         #1F2937  (gray-800)
Accent:          #06B6D4  (cyan-500)
Success:         #22C55E  (green-500)
Warning:         #F59E0B  (amber-500)
Error:           #EF4444  (red-500)

/* Text Colors */
Primary Text:    #FFFFFF  (white)
Secondary Text:  #9CA3AF  (gray-400)
Disabled Text:   #6B7280  (gray-500)

/* Borders */
Border:          #374151  (gray-700)
Border Accent:   #06B6D4  (cyan-500/30)

/* Highlights */
Selection:       #22C55E  (green-500)
Hover:           #374151  (gray-700)
Active:          #1F2937  (gray-800)
```

---

## 🎬 Animation Timing

```javascript
// Modal Animations
Modal Enter:  { duration: 0.3s, ease: spring(20) }
Modal Exit:   { duration: 0.2s, ease: easeOut }

// Button Hover
Hover:        { duration: 0.2s }
Active:       { duration: 0.1s }

// Progress Bar
Animate:      { duration: 1.5s, repeat: Infinity }

// Tabs
Tab Switch:   { duration: 0.2s }
```

---

## 📐 Responsive Breakpoints

```css
/* Modal Sizes */
Desktop:  90vw × 85vh  (default)
Tablet:   95vw × 90vh
Mobile:   98vw × 95vh

/* Grid Columns */
Desktop:  All columns visible
Tablet:   Hide some columns
Mobile:   Scrollable table
```

---

## 🎯 Completion Status

```
Frontend Components:  ████████████████████  100% ✅
Backend API:          ████████████████████  100% ✅
Documentation:        ████████████████████  100% ✅
Testing:              ████████████████████  100% ✅
Integration Examples: ████████████████████  100% ✅

Overall:              ████████████████████  100% ✅
```

---

**Visual Guide Complete! 🎨**

Last Updated: February 3, 2026
