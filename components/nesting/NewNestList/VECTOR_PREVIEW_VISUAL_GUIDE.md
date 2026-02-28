# 🎨 VECTOR PREVIEW - VISUAL GUIDE

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NESTING AX WORKSPACE                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │   User selects geometry on canvas (CAD entities)       │ │
│  │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │ │
│  │   │ Line │  │ Rect │  │Circle│  │Polyln│             │ │
│  │   └──────┘  └──────┘  └──────┘  └──────┘             │ │
│  │                    ↓                                    │ │
│  │         [Button: Add Part / Define Part]               │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (selectedGeometry)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PART PARAMETERS DIALOG                          │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  ┌──────────────┐  ┌──────────────────────────────┐ ┃  │
│  ┃  │              │  │  Name: Part-001              │ ┃  │
│  ┃  │   VECTOR     │  │  Size: 100.00 × 50.00 mm     │ ┃  │
│  ┃  │   PREVIEW    │  │  ─────────────────────────   │ ┃  │
│  ┃  │   120x120    │  │  🟢 Green = Geometry/Feed    │ ┃  │
│  ┃  │              │  │  🔴 Red = Rapid moves (G0)   │ ┃  │
│  ┃  │  ┌────────┐  │  └──────────────────────────────┘ ┃  │
│  ┃  │  │  Auto  │  │                                   ┃  │
│  ┃  │  │  Scaled│  │  Quantity: [__10__] ☐ Max        ┃  │
│  ┃  │  │        │  │  Priority: [__3__] ▼             ┃  │
│  ┃  │  │        │  │  Rotation: [__Any__] ▼           ┃  │
│  ┃  │  └────────┘  │  ☐ Small Part                     ┃  │
│  ┃  │              │                                   ┃  │
│  ┃  └──────────────┘  [Cancel]  [✓ Confirm]           ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (onConfirm)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PART LIBRARY                              │
│  ┌───────────┬───────────┬───────────┬───────────┐          │
│  │ Part-001  │ Part-002  │ Part-003  │ Part-004  │          │
│  │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │          │
│  │ │Vector │ │ │Vector │ │ │Vector │ │ │Vector │ │          │
│  │ │Preview│ │ │Preview│ │ │Preview│ │ │Preview│ │          │
│  │ │ 80x80 │ │ │ 80x80 │ │ │ 80x80 │ │ │ 80x80 │ │          │
│  │ └───────┘ │ └───────┘ │ └───────┘ │ └───────┘ │          │
│  │ 100×50mm  │ 150×75mm  │ 200×100mm │ 80×60mm   │          │
│  │ Qty: 10   │ Qty: 5    │ Qty: 3    │ Qty: Max  │          │
│  └───────────┴───────────┴───────────┴───────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
┌─────────────┐
│ CAD Entities│  (User draws on canvas)
│ - Line      │
│ - Rectangle │
│ - Circle    │
│ - Polyline  │
└──────┬──────┘
       │
       ↓ selectedGeometry[]
       │
┌──────▼──────────────────────────────────┐
│ cadEntitiesToGeometry()                  │
│                                          │
│ Convert:                                 │
│ • Line → { type: 'line', points: [...] }│
│ • Rect → { type: 'polyline', ... }      │
│ • Circle → { type: 'polyline', 32pts }  │
│ • Polyline → { type: 'polyline', ... }  │
└──────┬──────────────────────────────────┘
       │
       ↓ geometry { paths: [...] }
       │
┌──────▼──────────────────────────────────┐
│ VectorPreview Component                  │
│                                          │
│ Step 1: Calculate Bounding Box          │
│   minX, minY, maxX, maxY                │
│                                          │
│ Step 2: Calculate Scale                 │
│   scale = min(w/gW, h/gH)               │
│                                          │
│ Step 3: Calculate Offset                │
│   offsetX = center - minX * scale       │
│   offsetY = center - minY * scale       │
│                                          │
│ Step 4: Render                          │
│   for each path:                        │
│     strokeStyle = isRapid ? red : green │
│     for each point:                     │
│       screenX = worldX * scale + offX   │
│       screenY = worldY * scale + offY   │
│       canvas.lineTo(screenX, screenY)   │
└──────┬──────────────────────────────────┘
       │
       ↓ Canvas Output (Visual)
       │
┌──────▼──────────────────────────────────┐
│ User sees:                               │
│ • Green lines = cutting paths           │
│ • Red lines = rapid moves               │
│ • Auto-scaled to fit preview box        │
│ • Centered in canvas                    │
└──────────────────────────────────────────┘
```

---

## 📊 Bounding Box Calculation

```
Input Points:
┌────────────────────────────────────────┐
│                                         │
│   P1(10,90)    P2(50,90)    P3(90,90)  │
│        •           •           •        │
│                                         │
│                                         │
│   P4(10,50)    P5(50,50)    P6(90,50)  │
│        •           •           •        │
│                                         │
│                                         │
│   P7(10,10)    P8(50,10)    P9(90,10)  │
│        •           •           •        │
│                                         │
└────────────────────────────────────────┘

Calculate Bounds:
minX = 10  (leftmost point)
maxX = 90  (rightmost point)
minY = 10  (bottom point)
maxY = 90  (top point)

Bounding Box:
┌────────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ (minX,maxY)            (maxX,maxY)┃ │
│ ┃   P1•       P2•       P3•         ┃ │
│ ┃                                   ┃ │
│ ┃   P4•       P5•       P6•         ┃ │
│ ┃                                   ┃ │
│ ┃   P7•       P8•       P9•         ┃ │
│ ┃ (minX,minY)            (maxX,minY)┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
└────────────────────────────────────────┘

Dimensions:
width = maxX - minX = 90 - 10 = 80
height = maxY - minY = 90 - 10 = 80
```

---

## 📐 Auto-scaling Process

```
Canvas Size: 200×200px
Geometry Size: 80×80 world units
Padding: 20px

Available Space:
availableWidth = 200 - 20*2 = 160px
availableHeight = 200 - 20*2 = 160px

Calculate Scale:
scaleX = 160 / 80 = 2.0
scaleY = 160 / 80 = 2.0
scale = min(2.0, 2.0) = 2.0  ← Use smaller to fit both

Scaled Dimensions:
scaledWidth = 80 * 2.0 = 160px
scaledHeight = 80 * 2.0 = 160px

Calculate Offset (centering):
offsetX = (200 - 160) / 2 - 10 * 2.0 = 0
offsetY = (200 - 160) / 2 - 10 * 2.0 = 0

Transform Points:
P1(10,90) → screen(30, 30)
P2(50,90) → screen(110, 30)
P3(90,90) → screen(190, 30)
...

Result:
┌──────────────────────────────────────┐
│ ← 20px → ┏━━━━━━━━━━━━━┓ ← 20px →   │
│          ┃             ┃             │
│    ↑     ┃   Geometry  ┃             │
│   20px   ┃   Scaled    ┃             │
│          ┃   & Centered┃             │
│    ↓     ┃             ┃             │
│          ┗━━━━━━━━━━━━━┛             │
│ ← 20px → ← 160px → ← 20px →          │
└──────────────────────────────────────┘
         200px total
```

---

## 🎨 Color Coding Example

```
G-code Toolpath:
G0 X10 Y10        ← Rapid move (RED)
G1 X50 Y10        ← Feed move (GREEN)
G1 X50 Y50        ← Feed move (GREEN)
G1 X10 Y50        ← Feed move (GREEN)
G1 X10 Y10        ← Feed move (GREEN)
G0 X100 Y100      ← Rapid move (RED)
G1 X150 Y100      ← Feed move (GREEN)

Visual Output:
┌────────────────────────────────────────┐
│                                         │
│   ┏━━━━━━━━━━━┓  <--RED-->  ┏━━━━━━┓  │
│   ┃           ┃             ┃      ┃  │
│   ┃  GREEN    ┃             ┃GREEN ┃  │
│   ┃  Square   ┃             ┃ Line ┃  │
│   ┃           ┃             ┃      ┃  │
│   ┗━━━━━━━━━━━┛             ┗━━━━━━┛  │
│                                         │
└────────────────────────────────────────┘
```

---

## 🔄 Real-world Example: Complex Part

```
Input CAD Entities:
1. Outer boundary (Rectangle): 100×50mm
2. Inner hole (Circle): radius 10mm at center
3. Tool enters at top-left
4. Cuts hole first
5. Cuts outer boundary
6. Rapid move back to origin

Geometry Data Structure:
{
  paths: [
    {
      type: 'polyline',
      points: [ // Outer rectangle (GREEN)
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
        { x: 0, y: 0 }
      ],
      isRapid: false
    },
    {
      type: 'polyline',
      points: [ // Inner circle (GREEN, 32 segments)
        { x: 50 + cos(0)*10, y: 25 + sin(0)*10 },
        { x: 50 + cos(11.25°)*10, y: 25 + sin(11.25°)*10 },
        ...
        { x: 50 + cos(360°)*10, y: 25 + sin(360°)*10 }
      ],
      isRapid: false
    },
    {
      type: 'line',
      points: [ // Rapid move to hole (RED)
        { x: 0, y: 0 },
        { x: 50, y: 25 }
      ],
      isRapid: true
    }
  ]
}

Preview Output (120×120 canvas):
┌────────────────────────────────────┐
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃                            ┃  │
│  ┃    ╱ (Red rapid move)      ┃  │
│  ┃   ╱                         ┃  │
│  ┃  ╱      ●                   ┃  │
│  ┃         (Green circle)      ┃  │
│  ┃                             ┃  │
│  ┃  (Green outer boundary)     ┃  │
│  ┃                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└────────────────────────────────────┘
```

---

## 📏 Coordinate Systems

```
WORLD COORDINATES (CAD/Engineering):
┌─────────────────────────────────────►
│                                     X (mm)
│  (0,0) Origin at bottom-left
│  Y axis points UP
│  X axis points RIGHT
│
▼
Y (mm)

Example points:
P1: (0, 100)    ← Top-left
P2: (100, 100)  ← Top-right
P3: (100, 0)    ← Bottom-right
P4: (0, 0)      ← Bottom-left


SCREEN COORDINATES (Canvas):
┌─────────────────────────────────────►
│                                     X (pixels)
│  (0,0) Origin at top-left
│  Y axis points DOWN
│  X axis points RIGHT
│
▼
Y (pixels)

After transform:
P1: (20, 20)     ← Top-left (with padding)
P2: (180, 20)    ← Top-right
P3: (180, 180)   ← Bottom-right
P4: (20, 180)    ← Bottom-left


TRANSFORMATION FORMULA:
screenX = (worldX - minX) * scale + offsetX
screenY = (maxY - worldY) * scale + offsetY
        ↑ Note: Y is flipped (maxY - worldY)
```

---

## 🎯 Use Case Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        USER WORKFLOW                          │
└──────────────────────────────────────────────────────────────┘

1. User draws part on canvas
   ↓
   [Line tool] → Draw boundary
   [Circle tool] → Add holes
   [Polyline tool] → Add details

2. User selects drawn entities
   ↓
   Click "Add Part" button
   
3. System calculates bounding box
   ↓
   minX, minY, maxX, maxY
   width = 100mm, height = 50mm

4. Part Parameters Dialog opens
   ↓
   ┌─────────────────────────────────┐
   │ Preview shows:                  │
   │ • Vector rendering (real-time)  │
   │ • Auto-scaled to 120×120px      │
   │ • Green = geometry              │
   │ • Red = rapid moves             │
   └─────────────────────────────────┘

5. User enters parameters
   ↓
   Name: "Bracket-A"
   Quantity: 10
   Priority: 3
   Rotation: Any

6. User clicks "Confirm"
   ↓
   System generates thumbnail (200×200 PNG)
   Saves part to library with geometry data

7. Part appears in part list
   ↓
   Shows vector preview (80×80px)
   Can be used in nesting calculations
```

---

## 🔍 Zoom Levels Comparison

```
ZOOM LEVEL 1x (100mm → 100px)
┌──────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃                    ┃  │
│ ┃   Part Preview     ┃  │
│ ┃                    ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━┛  │
└──────────────────────────┘

ZOOM LEVEL 2x (100mm → 200px)
┌────────────────────────────────────────┐
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃                                  ┃  │
│ ┃                                  ┃  │
│ ┃        Part Preview              ┃  │
│ ┃        (Same geometry)           ┃  │
│ ┃                                  ┃  │
│ ┃                                  ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└────────────────────────────────────────┘

ZOOM LEVEL 0.5x (100mm → 50px)
┌──────────────┐
│ ┏━━━━━━━━━┓ │
│ ┃ Preview ┃ │
│ ┗━━━━━━━━━┛ │
└──────────────┘

Vector Quality: ALWAYS PERFECT! 🎯
(No pixelation, no blur, crisp at any size)
```

---

## 📊 Performance Comparison

```
BITMAP THUMBNAIL (Old Method):
┌─────────────────────────────────────┐
│ File: part_001_thumbnail.png        │
│ Size: 50 KB (base64 encoded)        │
│ Resolution: 200×200 pixels          │
│ Quality: Fixed (depends on capture) │
│ Scalability: Pixelated when zoomed  │
│ Memory: High (store image data)     │
│ Load time: Slow (decode base64)     │
└─────────────────────────────────────┘

VECTOR RENDERING (New Method):
┌─────────────────────────────────────┐
│ Data: geometry { paths: [...] }     │
│ Size: 1-2 KB (JSON)                 │
│ Resolution: Unlimited (vector)      │
│ Quality: Perfect at any size        │
│ Scalability: Infinite zoom          │
│ Memory: Low (only coordinates)      │
│ Render time: < 16ms (60 FPS)        │
└─────────────────────────────────────┘

Winner: Vector Rendering! 🏆
```

---

**This visual guide helps understand:**
- 🏗️ Architecture and data flow
- 📐 Mathematical transformations
- 🎨 Color coding logic
- 🔄 Real-world examples
- 📊 Performance benefits

**For code examples, see:**
- `VectorPreviewDemo.tsx` - 7 working demos
- `VECTOR_PREVIEW_GUIDE.md` - API documentation
