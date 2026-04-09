// ============================================================
// DRAWING TOOLS - USAGE GUIDE
// Công cụ vẽ được sao chép từ BB1 NestingAX Workspace
// ============================================================

## 📋 Overview

Công cụ DRAW cho phép bạn:
- Vẽ Line (Đường thẳng)
- Vẽ Rectangle (Hình chữ nhật)
- Vẽ Circle (Hình tròn)
- Vẽ Polyline (Đường gấp khúc)
- Vẽ Spline (Đường cong)

## 🎮 Components

### 1. DrawingTools.tsx
- UI toolbar cho việc chọn công cụ
- Keyboard shortcuts (L, R, C, P, S)
- Quản lý CAD entities
- State management cho drawing

### 2. DrawingWorkspace.tsx
- Canvas render engine
- View/Zoom controls
- Grid display
- Real-time drawing preview
- Mouse event handling

## 🚀 Quick Start

### Import Components
```tsx
import { DrawingWorkspace, DrawingTools } from '@/components/nesting';
```

### Basic Usage
```tsx
import React, { useState } from 'react';
import DrawingWorkspace, { type CadEntity } from './DrawingWorkspace';

export default function MyNestingApp() {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="w-full h-screen">
      <DrawingWorkspace
        activeDrawTool={activeTool}
        onToolChange={setActiveTool}
        onCadEntitiesChange={setCadEntities}
        width={1200}
        height={600}
      />
    </div>
  );
}
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Tool | Action |
|----------|------|--------|
| L | Line | Vẽ đường thẳng (click 2 điểm) |
| R | Rectangle | Vẽ hình chữ nhật (click 2 góc) |
| C | Circle | Vẽ hình tròn (click tâm, click bán kính) |
| P | Polyline | Vẽ đường gấp khúc (click nhiều điểm) |
| S | Spline | Vẽ đường cong (click nhiều điểm) |
| Esc | Pointer | Hủy công cụ vẽ |
| Enter | Finish | Kết thúc polyline/spline |
| Right Click | Cancel | Kết thúc polyline/spline và hủy công cụ |

## 🎨 Canvas Controls

- **Scroll/Wheel**: Zoom in/out
- **Drag (Middle Button)**: Pan view
- **Left Click**: Draw with active tool
- **Right Click**: Finish polyline/spline hoặc hủy tool

## 📐 CAD Entities

Mỗi entity có structure:
```tsx
interface CadEntity {
  id: string;           // Unique identifier
  type: 'line' | 'rect' | 'circle' | 'polyline' | 'spline';
  points: Point[];      // Array of {x, y} coordinates
  properties?: {
    radius?: number;    // Cho circle
  };
}
```

## 🔧 Integration with NestingWorkspace

Để tích hợp DrawingWorkspace vào NestingWorkspace:

```tsx
import DrawingWorkspace, { type CadEntity } from '@/components/nesting/DrawingWorkspace';

export default function NestingWorkspace() {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);

  return (
    <div className="flex gap-4">
      <DrawingWorkspace
        onCadEntitiesChange={setCadEntities}
        width={900}
        height={600}
      />
      
      {/* Hiển thị CAD entities */}
      <div className="flex-1 overflow-auto">
        <h3>Drawn Entities ({cadEntities.length})</h3>
        {cadEntities.map(entity => (
          <div key={entity.id} className="text-xs p-2 bg-slate-700 rounded mb-1">
            <span>{entity.type}</span> - {entity.points.length} points
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎯 Features

### Drawing Features
- ✅ Multi-tool support
- ✅ Real-time preview
- ✅ Grid display
- ✅ Zoom/Pan controls
- ✅ Keyboard shortcuts
- ✅ CAD entity storage

### View Features
- ✅ Dynamic grid
- ✅ Zoom with mouse wheel
- ✅ Pan with drag
- ✅ Coordinate conversion (Screen ↔ World)
- ✅ Info bar showing zoom level & entity count

## 📝 Files Added

```
ax/components/nesting/
  ├── DrawingTools.tsx          (UI toolbar + keyboard shortcuts)
  ├── DrawingWorkspace.tsx      (Canvas + viewport logic)
  └── DRAWING_TOOLS_README.md   (This file)
```

## 🔄 State Management

### Drawing State
```tsx
interface DrawState {
  step: number;                    // Current step (0 = start, 1 = in progress)
  points: { x: number; y: number }[];  // Drawn points
  currentPos: { x: number; y: number } | null;  // Current mouse position
}
```

### Workspace State
- `activeDrawTool`: Công cụ vẽ hiện tại
- `cadEntities`: Mảng các entity đã vẽ
- `zoom`: Mức zoom
- `viewOffset`: Vị trí viewport
- `showGrid`: Hiển thị lưới hay không

## 🐛 Troubleshooting

### Canvas not rendering
- Kiểm tra ref `containerRef` có được attach không
- Kiểm tra `width` và `height` props

### Drawing not working
- Kiểm tra `activeDrawTool` có được set không
- Kiểm tra mouse events có được trigger không

### Performance issues
- Giảm số entities hoặc grid size
- Kiểm tra animation frame refresh rate

## 📚 References

- Sao chép từ: BB1 NestingAX Workspace.tsx
- Tương thích với: AX nesting system
- Framework: React + TypeScript
- Styling: Tailwind CSS

## ✅ Checklist for Integration

- [ ] Import DrawingWorkspace component
- [ ] Add state for cadEntities
- [ ] Add state for activeDrawTool
- [ ] Handle onCadEntitiesChange callback
- [ ] Handle onToolChange callback
- [ ] Export to PartParametersDialog (tùy chọn)
- [ ] Test drawing functionality
- [ ] Test keyboard shortcuts
- [ ] Test zoom/pan controls

