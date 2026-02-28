# Frontend UI/UX Skill - Design System for Nesting Tool

## Description
Designer-turned-developer who crafts stunning UI/UX even without design mockups. Specialized in React + TypeScript + CSS for industrial/CAD applications.

## Design Principles for Nesting Tool

### 1. Industrial Aesthetic
- Dark theme preferred for CAD applications
- High contrast for visibility
- Professional, technical appearance
- Matrix/digital style accents

### 2. Color Palette
```css
/* Primary colors */
--primary: #00ff00;        /* Neon green for highlights */
--primary-dark: #00cc00;   /* Darker green */
--accent: #0080ff;         /* Blue for actions */
--warning: #ffaa00;        /* Orange for warnings */
--error: #ff4444;          /* Red for errors */

/* Backgrounds */
--bg-dark: #1a1a1a;        /* Main dark background */
--bg-darker: #0d0d0d;      /* Darker sections */
--bg-panel: #2a2a2a;       /* Panel backgrounds */
--bg-input: #333333;       /* Input fields */

/* Text */
--text-primary: #ffffff;   /* Main text */
--text-secondary: #aaaaaa; /* Secondary text */
--text-muted: #666666;     /* Muted text */
```

### 3. Component Patterns

#### Buttons
```typescript
// Primary action button
<button className="px-4 py-2 bg-green-600 hover:bg-green-500 
  text-white rounded transition-colors font-medium">
  Start Nesting
</button>

// Secondary button
<button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 
  text-white rounded border border-gray-600">
  Cancel
</button>

// Icon button
<button className="p-2 hover:bg-gray-700 rounded 
  text-gray-300 hover:text-white transition-colors">
  <Trash2 size={18} />
</button>
```

#### Panels
```typescript
// Side panel
<div className="w-80 bg-[#1a1a1a] border-r border-gray-700 
  flex flex-col">
  <div className="p-4 border-b border-gray-700">
    <h3 className="text-white font-semibold">Sheet Database</h3>
  </div>
  <div className="flex-1 overflow-auto p-4">
    {/* Content */}
  </div>
</div>
```

#### Dialogs
```typescript
// Modal dialog
<div className="fixed inset-0 bg-black/50 flex items-center 
  justify-center z-50">
  <div className="bg-[#2a2a2a] rounded-lg shadow-xl 
    max-w-md w-full m-4">
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-white text-lg font-semibold">
        Add New Sheet
      </h2>
    </div>
    <div className="p-4">
      {/* Form content */}
    </div>
  </div>
</div>
```

### 4. Layout Patterns

#### Three-Column Layout (Nesting Workspace)
```typescript
<div className="flex h-screen bg-[#0d0d0d]">
  {/* Left sidebar - Tools/Parts */}
  <aside className="w-64 bg-[#1a1a1a] border-r border-gray-700">
    {/* Tools panel */}
  </aside>
  
  {/* Main canvas area */}
  <main className="flex-1 relative">
    <canvas className="w-full h-full" />
  </main>
  
  {/* Right sidebar - Properties */}
  <aside className="w-72 bg-[#1a1a1a] border-l border-gray-700">
    {/* Properties panel */}
  </aside>
</div>
```

### 5. Animation Guidelines

#### Using Framer Motion
```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Panel slide-in
<motion.div
  initial={{ x: -300 }}
  animate={{ x: 0 }}
  exit={{ x: -300 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  {/* Panel content */}
</motion.div>

// Fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>

// Stagger children
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.1 } }
  }}
>
  {items.map(item => (
    <motion.div variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### 6. Icons
Always use Lucide React icons:
```typescript
import { 
  Layout, Calculator, FileUp, Settings, 
  Trash2, Edit, Save, Plus, X,
  ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react';
```

### 7. Responsive Considerations
- Minimum width: 1200px for full functionality
- Canvas area should be priority for space
- Panels can be collapsible on smaller screens
- Use flexbox for fluid layouts

### 8. Accessibility
- Keyboard navigation support
- Focus indicators
- ARIA labels for icon buttons
- High contrast mode support

### 9. CAD-Specific UI Patterns

#### Coordinate Display
```typescript
<div className="fixed bottom-4 left-4 bg-black/70 
  text-green-400 font-mono px-3 py-1 rounded">
  X: {x.toFixed(2)} Y: {y.toFixed(2)}
</div>
```

#### Status Bar
```typescript
<div className="h-8 bg-[#1a1a1a] border-t border-gray-700 
  flex items-center px-4 text-sm">
  <span className="text-gray-400">Status:</span>
  <span className="text-green-400 ml-2">Ready</span>
  <span className="mx-4 text-gray-600">|</span>
  <span className="text-gray-400">Zoom: 100%</span>
</div>
```

#### Toolbar
```typescript
<div className="flex items-center gap-1 p-2 bg-[#1a1a1a] 
  border-b border-gray-700">
  <button className={`p-2 rounded ${activeTool === 'select' 
    ? 'bg-green-600 text-white' 
    : 'hover:bg-gray-700 text-gray-300'}`}>
    <MousePointer size={18} />
  </button>
  {/* More tools */}
</div>
```

## Best Practices
1. Consistent spacing (use multiples of 4)
2. Hover states on all interactive elements
3. Loading states for async operations
4. Error boundaries for crash recovery
5. Theme consistency throughout
