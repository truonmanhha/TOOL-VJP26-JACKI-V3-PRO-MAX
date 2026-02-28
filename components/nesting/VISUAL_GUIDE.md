# 🎨 VISUAL GUIDE: Add Part Flow

## 🔑 KEY DIFFERENCES

### ❌ OLD BEHAVIOR (Buggy)
```
User Action              System Response
─────────────────────────────────────────────
Select objects           ✓ Highlight
Right-Click              ❌ Radial Menu appears (WRONG!)
                         ❌ Blocks parameter dialog
```

### ✅ NEW BEHAVIOR (Fixed)
```
User Action              System Response
─────────────────────────────────────────────
Select objects           ✓ Highlight blue
Press ENTER ⏎            ✓ Parameters Dialog opens
Input data + OK          ✓ Part added to list
Right-Click 🖱️           ✓ Finish & reopen modal
                         ✓ NO Radial Menu during selection
```

---

## 📊 STATE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
│  isSelectingParts = false                                   │
│  isNestingSelectionMode = false                             │
│  Radial Menu = ENABLED                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Click "Add Part"
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  SELECTION MODE                             │
│  isSelectingParts = true ✅                                 │
│  isNestingSelectionMode = true ✅                           │
│  Radial Menu = SUPPRESSED 🚫                                │
│                                                             │
│  User can:                                                  │
│    • Left-Click objects (select)                            │
│    • ENTER (open params dialog)                             │
│    • Right-Click (finish selection)                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Right-Click
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACK TO NORMAL                            │
│  isSelectingParts = false                                   │
│  isNestingSelectionMode = false                             │
│  Radial Menu = ENABLED again ✅                             │
│  Modal reopens with parts list                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 COMMUNICATION FLOW

```
┌──────────────────┐
│  NestingTool.tsx │
│                  │
│  State Changes:  │
│  isSelectingParts│
│  isSelectingSheet│
└────────┬─────────┘
         │
         │ useEffect detects change
         │
         ↓
    onSelectionModeChange(true/false)
         │
         │ Callback execution
         │
         ↓
┌──────────────────┐
│     App.tsx      │
│                  │
│  State Updates:  │
│  isNestingSelectionMode = true/false
│                  │
│  Effect:         │
│  handleContextMenu checks this
│  → If true: suppress Radial Menu
│  → If false: show Radial Menu
└──────────────────┘
```

---

## 🎯 USER JOURNEY MAP

```
Step 1: ENTRY
─────────────────────────────────────────────
Canvas State:     Normal drawing mode
Radial Menu:      Active ✅
User sees:        "NEW NEST LIST" button
User clicks:      Button → Modal appears


Step 2: START SELECTION
─────────────────────────────────────────────
User clicks:      "Thêm Chi Tiết Từ Bản Vẽ"
Modal:            Closes
Prompt appears:   "🎯 Select parts → ENTER → Right-Click"
Radial Menu:      SUPPRESSED 🚫
Selection mode:   ACTIVE ✅


Step 3: SELECT GEOMETRY
─────────────────────────────────────────────
User clicks:      Line1, Line2, Circle
Visual feedback:  Objects highlight blue
selectedIds:      {line1_id, line2_id, circle_id}
Prompt:           Still showing "ENTER → Right-Click"


Step 4: OPEN PARAMETERS DIALOG
─────────────────────────────────────────────
User presses:     ENTER ⏎
System:           handleConfirmPartSelection() fires
Calculations:     Width, Height, Area computed
Dialog appears:   Part Parameters Dialog ✨
Selection mode:   STILL ACTIVE (background)
Radial Menu:      STILL SUPPRESSED


Step 5: INPUT DATA
─────────────────────────────────────────────
Dialog shows:     
  • Preview: 500 × 200 (100000 mm²)
  • Name input (autofocus)
  • Quantity mode radios
  • Number input
User enters:      
  • Name: "Cạnh Bên"
  • Mode: Custom
  • Quantity: 4


Step 6: CONFIRM ADDITION
─────────────────────────────────────────────
User clicks:      "Xác Nhận" button (or ENTER)
System:           handleConfirmPartParameters() fires
Part added:       newNestListParts += new part ✅
Dialog:           Closes
Selection:        Cleared (ready for next)
Prompt updates:   "Select more + ENTER, or Right-Click"
Selection mode:   STILL ACTIVE (can add more)


Step 7A: ADD MORE (Loop)
─────────────────────────────────────────────
User selects:     Another object
User presses:     ENTER
Loop back to:     Step 4


Step 7B: FINISH
─────────────────────────────────────────────
User:             Right-Clicks 🖱️
System:           handleFinishSelection() fires
Selection mode:   DEACTIVATED ✅
Radial Menu:      RE-ENABLED ✅
Modal:            REOPENS with parts list
User sees:        Panel 2 with all added parts
```

---

## 🎨 UI STATE VISUALIZATION

### Canvas Overlays During Selection Mode

```
┌──────────────────────────────────────────────────────┐
│  Canvas                                              │
│                                                      │
│  ┌────────┐                                          │
│  │ Line1  │ ← Highlight: #3b82f6 (blue)             │
│  └────────┘                                          │
│                                                      │
│      🔵                                               │
│     Circle ← Highlight: #3b82f6 (blue)              │
│                                                      │
│  ┌─────────┐                                         │
│  │Rectangle│ ← Not selected (normal color)          │
│  └─────────┘                                         │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Prompt Bar (Bottom)                                 │
│  🎯 Select parts → Press ENTER to set params →      │
│     Right-Click when done                            │
└──────────────────────────────────────────────────────┘
```

### Dialog Appearance

```
┌───────────────────────────────────────────────────┐
│  Background: Semi-transparent backdrop             │
│              (backdrop-blur-md)                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  📦 Thông Số Chi Tiết                       │  │
│  ├─────────────────────────────────────────────┤  │
│  │  📊 Part Info:                              │  │
│  │    Width: 500.00 mm                         │  │
│  │    Height: 200.00 mm                        │  │
│  │    Area: 100000.00 mm²                      │  │
│  ├─────────────────────────────────────────────┤  │
│  │  Tên chi tiết *                             │  │
│  │  [Part 1________________________]           │  │
│  │                                             │  │
│  │  Số lượng                                   │  │
│  │  ○ Max Possible (tối đa có thể)            │  │
│  │  ● Custom Quantity                          │  │
│  │    [1___]                                   │  │
│  ├─────────────────────────────────────────────┤  │
│  │  [Hủy]                   [✓ Xác Nhận]      │  │
│  │  gray                    gradient purple    │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  Click outside or ESC → Close without saving     │
│  Click Xác Nhận or ENTER → Add part              │
└───────────────────────────────────────────────────┘
```

---

## 🔍 DEBUGGING VISUAL CHECKLIST

### ✅ Radial Menu Fix Working:
```
Test 1: Normal Context Menu
  1. NOT in selection mode
  2. Right-Click anywhere
  → Radial Menu appears ✅

Test 2: Suppressed During Selection
  1. Click "Add Part" (selection mode ON)
  2. Right-Click
  → Radial Menu DOES NOT appear ✅
  → Modal reopens instead ✅
  → Console: "🚫 Radial Menu suppressed" ✅
```

### ✅ Parameters Dialog Flow Working:
```
Test 1: Enter Key Triggers Dialog
  1. Select objects
  2. Press ENTER
  → Dialog appears ✅
  → Shows correct dimensions ✅

Test 2: Data Persists
  1. Input name + quantity
  2. Click OK
  → Dialog closes ✅
  → Part added to list ✅
  → Console: "✅ Added: [name]" ✅

Test 3: Multi-Add Loop
  1. Add Part 1 (ENTER → OK)
  2. Select more objects
  3. Add Part 2 (ENTER → OK)
  4. Right-Click
  → Modal shows BOTH parts ✅
```

---

## 📐 LAYOUT DIMENSIONS

### Dialog Size:
- Width: `max-w-md` (28rem / 448px)
- Backdrop: Full viewport with blur
- Z-index: `z-50` (above canvas, below other modals)

### Canvas Highlights:
- Selected: `strokeStyle = '#3b82f6'` (blue-500)
- Line width: `3px`
- Hover tolerance: `5 / zoom` pixels

### Prompt Bar:
- Position: Bottom of canvas container
- Height: `~60px`
- Background: `bg-slate-900/95`
- Text: `text-sm text-slate-200`

---

**Visual Guide Version:** 1.0  
**Last Updated:** Feb 3, 2026  
**Status:** ✅ All visuals match implemented behavior
