# UI/UX Pro Max Skill - Professional Design Guidelines

## Description
Comprehensive UI/UX design guide adapted for CNC nesting tool. Contains accessibility rules, interaction patterns, color palettes, typography guidelines, and professional design standards.

## Priority-Based Rule Categories

### 1. Accessibility (CRITICAL) - MUST FOLLOW

#### Color Contrast
- **Minimum 4.5:1 ratio** for normal text
- **Minimum 3:1 ratio** for large text (18pt+ or 14pt+ bold)
- **Test tools**: WebAIM Contrast Checker, browser devtools
- **CAD Context**: Green (#00ff00) on dark (#1a1a1a) = 12.6:1 ✓

```typescript
// Good contrast examples for nesting tool
const colors = {
  // Text on dark background
  textPrimary: '#ffffff',    // 15.3:1 on #1a1a1a
  textSecondary: '#a1a1aa',  // 9.8:1 on #1a1a1a
  textMuted: '#71717a',      // 6.5:1 on #1a1a1a
  
  // Accent colors
  accentGreen: '#22c55e',    // 7.2:1 on #1a1a1a
  accentBlue: '#3b82f6',     // 6.8:1 on #1a1a1a
  accentOrange: '#f97316',   // 6.2:1 on #1a1a1a
  accentRed: '#ef4444',      // 5.8:1 on #1a1a1a
};
```

#### Focus States
```css
/* Visible focus rings on all interactive elements */
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Custom focus for dark theme */
.dark button:focus-visible {
  outline: 2px solid #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
}
```

#### Form Labels
```typescript
// ALWAYS use label with htmlFor
<label htmlFor="sheet-width" className="text-sm font-medium text-gray-300">
  Chiều rộng tấm (mm)
</label>
<input
  id="sheet-width"
  type="number"
  aria-describedby="width-help"
  className="..."
/>
<span id="width-help" className="text-xs text-gray-500">
  Nhập chiều rộng từ 100-3000mm
</span>
```

#### ARIA Labels
```typescript
// Icon-only buttons MUST have aria-label
<button
  aria-label="Xóa chi tiết"
  className="p-2 hover:bg-red-900/30 rounded"
>
  <Trash2 size={18} className="text-red-400" />
</button>

// Complex components
<div role="toolbar" aria-label="Drawing tools">
  <button aria-label="Select tool" aria-pressed={selectedTool === 'select'}>
    <MousePointer size={20} />
  </button>
  <button aria-label="Rectangle tool" aria-pressed={selectedTool === 'rectangle'}>
    <Square size={20} />
  </button>
</div>
```

#### Keyboard Navigation
```typescript
// Tab order must match visual order
// Use tabIndex appropriately
tabIndex={0}   // Focusable in sequential order
tabIndex={-1}  // Focusable programmatically only

// Handle keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && selectedPart) {
      deletePart(selectedPart.id);
    }
    if (e.ctrlKey && e.key === 'z') {
      undo();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedPart]);
```

### 2. Touch & Interaction (CRITICAL)

#### Touch Target Size
```css
/* Minimum 44x44px touch targets */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 10px;
}

/* For smaller visual elements, use invisible padding */
.icon-button {
  position: relative;
  padding: 12px;
}

.icon-button::before {
  content: '';
  position: absolute;
  inset: -8px; /* Expands touch area */
}
```

#### Loading States
```typescript
// Disable button during async operations
const [isLoading, setIsLoading] = useState(false);

<button
  disabled={isLoading}
  className="..."
  aria-busy={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="animate-spin mr-2" size={16} />
      Đang xử lý...
    </>
  ) : (
    'Bắt đầu Nesting'
  )}
</button>
```

#### Error Feedback
```typescript
// Clear error messages near the problem
const ErrorMessage: React.FC<{ error: string | null }> = ({ error }) => {
  if (!error) return null;
  
  return (
    <div 
      className="flex items-center gap-2 text-red-400 text-sm mt-1"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle size={16} />
      {error}
    </div>
  );
};
```

#### Cursor Pointer
```css
/* Add cursor-pointer to ALL clickable elements */
button,
a,
[role="button"],
.clickable-card,
.selectable-item {
  cursor: pointer;
}

/* Disable pointer for disabled elements */
button:disabled,
.disabled {
  cursor: not-allowed;
}
```

### 3. Performance (HIGH)

#### Image Optimization
```typescript
// Use WebP format
<img 
  src="diagram.webp" 
  alt="Nesting diagram"
  width={800}
  height={600}
/>

// Use srcset for responsive images
<img
  src="preview-400.webp"
  srcSet="
    preview-400.webp 400w,
    preview-800.webp 800w,
    preview-1200.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 800px"
  alt="Part preview"
  loading="lazy"
/>
```

#### Reduced Motion
```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
>
  {/* Content */}
</motion.div>

// CSS approach
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Content Jumping Prevention
```typescript
// Reserve space for async content
<div className="min-h-[200px]">
  {isLoading ? (
    <Skeleton className="h-full" />
  ) : (
    <NestingResult data={data} />
  )}
</div>

// Fixed aspect ratio for images/videos
<div className="aspect-video bg-gray-800 rounded-lg">
  {previewUrl ? (
    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
  ) : (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chưa có preview
    </div>
  )}
</div>
```

### 4. Layout & Responsive (HIGH)

#### Viewport Meta
```html
<!-- Correct viewport meta -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">

<!-- For CAD applications that need precise control -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```

#### Font Size Requirements
```css
/* Minimum 16px body text on mobile to prevent zoom on focus */
body {
  font-size: 16px;
}

/* Scale down for larger screens if needed */
@media (min-width: 768px) {
  body {
    font-size: 14px;
  }
}
```

#### Horizontal Scroll Prevention
```css
/* Ensure content fits viewport width */
html, body {
  overflow-x: hidden;
  max-width: 100vw;
}

/* For scrollable containers */
.scroll-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
```

#### Z-Index Management
```typescript
// Define consistent z-index scale
const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  drawer: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
} as const;

// Usage
<div className={`z-${zIndex.modal}`}>
  <ModalContent />
</div>
```

### 5. Typography & Color (MEDIUM)

#### Line Height
```css
/* Body text: 1.5-1.75 line height */
body {
  line-height: 1.6;
}

/* Headings: tighter line height */
h1, h2, h3 {
  line-height: 1.2;
}

/* Code/UI text: tighter */
code, .mono {
  line-height: 1.4;
}
```

#### Line Length
```css
/* Limit to 65-75 characters per line for readability */
.readable-text {
  max-width: 65ch;
}

/* For wider content, increase line height */
.wide-content {
  max-width: 80ch;
  line-height: 1.7;
}
```

#### Font Pairing for CAD/Industrial Apps
```css
/* Primary: Clean sans-serif for UI */
--font-ui: 'Inter', system-ui, sans-serif;

/* Monospace: For coordinates and measurements */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Usage */
.coordinates {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

#### Dark Theme Color Palette
```typescript
const darkTheme = {
  // Backgrounds
  bg: {
    primary: '#0f172a',      // slate-900
    secondary: '#1e293b',    // slate-800
    tertiary: '#334155',     // slate-700
    elevated: '#1e293b',     // Cards, panels
  },
  
  // Text
  text: {
    primary: '#f8fafc',      // slate-50
    secondary: '#cbd5e1',    // slate-300
    muted: '#64748b',        // slate-500
    disabled: '#475569',     // slate-600
  },
  
  // Accents
  accent: {
    green: '#22c55e',        // Success, active
    blue: '#3b82f6',         // Primary actions
    orange: '#f97316',       // Warnings
    red: '#ef4444',          // Errors, delete
    purple: '#a855f7',       // Special features
  },
  
  // Borders
  border: {
    subtle: '#334155',       // slate-700
    default: '#475569',      // slate-600
    strong: '#64748b',       // slate-500
  },
};
```

### 6. Animation (MEDIUM)

#### Duration & Timing
```typescript
// Use 150-300ms for micro-interactions
const transitions = {
  instant: '0ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;

const easings = {
  default: 'ease-in-out',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
```

#### Transform Performance
```css
/* Use transform and opacity for animations */
.animated-element {
  transition: transform 200ms ease, opacity 200ms ease;
  will-change: transform, opacity;
}

/* AVOID animating these properties */
/* width, height, top, left, right, bottom, margin, padding */

/* Good: Slide in */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Bad: Width animation */
@keyframes expandBad {
  from { width: 0; }
  to { width: 100%; }
}
```

#### Loading States
```typescript
// Skeleton screens
const SkeletonCard: React.FC = () => (
  <div className="animate-pulse bg-slate-800 rounded-lg p-4">
    <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
  </div>
);

// Progress indicators
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-slate-700 rounded-full h-2">
    <div
      className="bg-green-500 h-2 rounded-full transition-all duration-300"
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  </div>
);
```

### 7. Style Selection (MEDIUM)

#### Match Style to Product Type
```typescript
// Industrial/CAD tools: Clean, technical, dark
const industrialStyle = {
  theme: 'dark',
  colors: 'monochromatic with green accents',
  typography: 'sans-serif + monospace',
  borders: 'subtle, precise',
  effects: 'minimal shadows, focus on content',
};

// Avoid for industrial tools:
// - Bright colors
// - Playful fonts
// - Heavy gradients
// - Decorative elements
```

#### Consistency Rules
```css
/* Use consistent spacing scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */

/* Use consistent border radius */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

#### Icon Guidelines
```typescript
// ALWAYS use SVG icons, NEVER emojis
// Recommended icon libraries:
// - Lucide React (best for CAD/industrial)
// - Heroicons
// - Tabler Icons

// Usage
import { 
  MousePointer, Square, Circle, Trash2, 
  Save, Upload, Download, Settings 
} from 'lucide-react';

// Consistent sizing
<MousePointer size={20} />  // Toolbar
<Trash2 size={18} />        // Action buttons
<Settings size={24} />      // Header icons
```

## Common Rules for Professional UI

### Visual Quality Checklist
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly (not var() wrapper)
- [ ] Brand logos are correct (if any)

### Interaction Checklist
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation
- [ ] Loading states for async operations

### Light/Dark Mode Checklist
- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout Checklist
- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility Checklist
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets minimum 44x44px

## Nesting Tool Specific Guidelines

### CAD Interface Patterns
```typescript
// Coordinate display
<div className="fixed bottom-4 left-4 bg-black/80 text-green-400 
  font-mono text-sm px-3 py-1.5 rounded backdrop-blur-sm">
  X: {x.toFixed(2)} Y: {y.toFixed(2)}
</div>

// Status bar
<div className="h-8 bg-slate-800 border-t border-slate-700 
  flex items-center px-4 text-xs text-slate-400">
  <span className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-green-500"></div>
    Ready
  </span>
  <span className="mx-3 text-slate-600">|</span>
  <span>Zoom: {zoom}%</span>
</div>

// Toolbar with active state
<div className="flex items-center gap-1 p-2 bg-slate-800 
  border-b border-slate-700">
  {tools.map(tool => (
    <button
      key={tool.id}
      onClick={() => setActiveTool(tool.id)}
      className={`p-2 rounded transition-colors ${
        activeTool === tool.id
          ? 'bg-green-600 text-white'
          : 'hover:bg-slate-700 text-slate-400 hover:text-white'
      }`}
      aria-label={tool.name}
      aria-pressed={activeTool === tool.id}
    >
      <tool.icon size={20} />
    </button>
  ))}
</div>
```

### Canvas Area
```typescript
// Canvas container with proper layering
<div className="relative flex-1 bg-slate-900 overflow-hidden">
  {/* Grid background */}
  <div 
    className="absolute inset-0 opacity-10"
    style={{
      backgroundImage: `
        linear-gradient(to right, #64748b 1px, transparent 1px),
        linear-gradient(to bottom, #64748b 1px, transparent 1px)
      `,
      backgroundSize: `${gridSize}px ${gridSize}px`
    }}
  />
  
  {/* Main canvas */}
  <canvas
    ref={canvasRef}
    className="absolute inset-0 cursor-crosshair"
    onMouseMove={handleMouseMove}
    onClick={handleClick}
  />
  
  {/* Overlay UI */}
  <div className="absolute top-4 right-4 flex flex-col gap-2">
    <ZoomControls zoom={zoom} onZoomChange={setZoom} />
    <LayerControls />
  </div>
</div>
```

### Part List Panel
```typescript
// Part item with hover actions
<div className="group flex items-center justify-between p-3 
  hover:bg-slate-800 rounded-lg transition-colors cursor-pointer
  border border-transparent hover:border-slate-700">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-slate-700 rounded flex items-center 
      justify-center">
      <Box size={20} className="text-slate-400" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-200">
        {part.name}
      </p>
      <p className="text-xs text-slate-500">
        {part.quantity} × {part.width}×{part.height}mm
      </p>
    </div>
  </div>
  
  {/* Actions visible on hover */}
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
    transition-opacity">
    <button 
      aria-label="Chỉnh sửa"
      className="p-1.5 hover:bg-slate-700 rounded"
    >
      <Edit size={16} />
    </button>
    <button 
      aria-label="Xóa"
      className="p-1.5 hover:bg-red-900/50 text-red-400 rounded"
    >
      <Trash2 size={16} />
    </button>
  </div>
</div>
```

## Pre-Delivery Checklist

Before delivering UI code, verify:

### Critical (Must Fix)
- [ ] Color contrast ratios meet WCAG AA (4.5:1)
- [ ] All interactive elements have visible focus states
- [ ] Touch targets are minimum 44x44px
- [ ] No horizontal scroll on mobile
- [ ] All images have alt text
- [ ] Form inputs have associated labels

### High Priority (Should Fix)
- [ ] Loading states for all async operations
- [ ] Error messages are clear and contextual
- [ ] All clickable elements have cursor-pointer
- [ ] Viewport meta tag is correct
- [ ] No content jumping during load

### Medium Priority (Nice to Have)
- [ ] Smooth transitions (150-300ms)
- [ ] Consistent spacing using design system
- [ ] Hover states provide feedback
- [ ] prefers-reduced-motion supported
- [ ] Z-index scale is consistent

### Professional Polish
- [ ] No emojis as icons
- [ ] Consistent icon sizing
- [ ] Typography follows guidelines
- [ ] Dark mode fully supported
- [ ] Responsive at all breakpoints
