# AGENTS.md — VJP26 JACKI V3 (CNC Nesting Tool)

## Project Overview

Professional CNC nesting/sheet-metal optimization tool. React + TypeScript frontend with Vite, Express.js proxy backend, optional Python FastAPI nesting API. Features: DXF parsing, GCode 3D preview, area calculator, and multi-algorithm nesting engine (MaxRects, genetic, hybrid).

**Stack**: Vite 6 · React 18 · TypeScript 5.8 · Three.js/R3F · Tailwind (CDN) · Framer Motion · Express.js · Python FastAPI (optional backend)

---

## Build / Dev / Test Commands

```bash
# Install dependencies
npm install

# Development server (Vite on :5173, proxies /api to Express on :3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Start Express backend (separate terminal)
node server.js

# Start Python nesting API (optional, separate terminal)
cd backend && pip install -r requirements.txt && uvicorn nesting_api:app --reload --port 8000
```

### No Test Framework

There is **no test runner configured** (no jest/vitest/bun test). No `test` script in package.json. No test files exist. If adding tests, use Vitest (already Vite-based) — add `vitest` to devDependencies and create `vitest.config.ts`.

### Type Checking

```bash
# Type-check entire project (no build, fast)
npx tsc --noEmit

# Type-check with watch mode (continuous, incremental)
npx tsc --noEmit --watch
```

**Config details**: `skipLibCheck: true` (skips third-party type errors), `allowJs: true` (allows mixed JS/TS files), `moduleResolution: bundler`, no strict null checks enabled. Pattern: handle nulls defensively with `if (!x) return` checks.

### Testing

**No test framework configured** — no Jest, Vitest, or similar. No test files exist in project. If tests are needed:
```bash
# Add Vitest (Vite-native test runner)
npm install --save-dev vitest @vitest/ui

# Create vitest.config.ts (Vite-compatible)
# Then: npx vitest
```

### Linting & Formatting

**No ESLint or Prettier configured.** Code style is maintained manually. Follow existing patterns in this codebase (see Code Style section below).

---

## Project Structure

```
├── index.html              # Entry HTML (Tailwind CDN, importmap, global styles)
├── index.tsx               # React root mount
├── App.tsx                 # Main app — tab routing (calc/dxf/gcode/nest)
├── constants.tsx           # i18n translations (vi/zh/ko/hi), currency formatting
├── types.ts                # Core type definitions (NestingPart, PlacedPart, etc.)
├── types/CADTypes.ts       # CAD entity types (Line, Arc, Circle, Polyline, etc.)
├── server.js               # Express proxy backend (Discord webhooks, visit tracking)
├── vite.config.ts          # Vite config — path alias @/*, API proxy, env vars
├── tsconfig.json           # TS config — ES2022, bundler resolution, @/* paths
│
├── components/
│   ├── AreaCalculator.tsx   # CNC area calculator tool
│   ├── ChatBot.tsx          # AI chatbot (Gemini)
│   ├── DxfTool.tsx          # DXF file analysis UI
│   ├── DxfPreview.tsx       # DXF 2D preview renderer
│   ├── GCodeViewer.tsx      # GCode 3D viewer (Three.js/R3F) — largest component
│   ├── NestingAXApp.tsx     # Main NestingAX app (standalone sub-app)
│   ├── MatrixBackground.tsx # Animated matrix background
│   ├── nesting/             # Legacy nesting UI components + barrel index.ts
│   │   ├── NestingContext.tsx  # React Context for nesting state
│   │   ├── DrawingTools.tsx    # CAD-style drawing tools
│   │   └── ...              # Panels, dialogs, settings
│   └── NestingAX/           # New NestingAX sub-app
│       ├── services/db.ts   # localStorage-based database
│       ├── services/nesting.ts  # Nesting execution service
│       ├── Header/Sidebar/Workspace/Footer.tsx
│       └── RadialMenu.tsx   # Context radial menu
│
├── services/
│   ├── dxfService.ts        # DXF parser (uses dxf-parser lib)
│   ├── gcodeService.ts      # GCode parsing and analysis
│   ├── CADEngine.ts         # Geometry kernel (snap, transform, intersection)
│   ├── nestingService.ts    # MaxRects bin-packing nesting
│   └── nesting/             # Advanced nesting engine
│       ├── index.ts         # AdvancedNestingEngine class + barrel exports
│       ├── geometry.ts      # 2D geometry ops (polygon area, bounds, rotation)
│       ├── nfpGenerator.ts  # No-Fit Polygon + greedy placement
│       ├── geneticNesting.ts # Genetic algorithm nesting
│       ├── remnantManager.ts # Leftover material tracking
│       └── fileParser.ts    # DXF/SVG file parsing
│
├── workers/
│   └── gcode.worker.ts     # Web Worker for streaming GCode parsing
│
├── backend/
│   ├── nesting_api.py       # FastAPI nesting API (Python)
│   └── requirements.txt     # Python deps: fastapi, uvicorn, numpy, pydantic
│
└── SKILL/                   # Agent skill files (domain knowledge for AI agents)
```

---

## Code Style and Conventions

### TypeScript

- **Target**: ES2022, module ESNext, JSX react-jsx
- **Path alias**: `@/*` maps to project root (e.g., `import { Point } from '@/types'`)
- **Interfaces over types** for object shapes; `type` for unions/aliases
- **Naming**: PascalCase for components/classes/interfaces/types, camelCase for functions/variables, UPPER_SNAKE for constants
- **IDs**: Generated with `` `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` ``
- **`any` usage**: Present in codebase (esp. `dxf-parser` typings) — minimize but tolerated for third-party libs
- **No strict null checks** enforced (not in tsconfig), but handle nulls defensively with `if (!x) return`

### React Patterns

- **Functional components only** — `React.FC<Props>` or plain function declarations
- **State**: `useState` + `useCallback` + `useEffect` — no Redux/Zustand
- **Context**: React Context + custom `useXxx` hooks for shared state (see `NestingContext.tsx`)
- **Refs**: `useRef` for DOM elements, canvas, and imperative handles
- **Memoization**: `useMemo` / `useCallback` for expensive computations and Three.js objects
- **Component files**: One component per file, named same as export (PascalCase)
- **Props**: Defined as interfaces in same file or imported from `types.ts`

### Styling

- **Tailwind CSS via CDN** (loaded in index.html `<script src="https://cdn.tailwindcss.com">`)
- **Dark theme**: Background `bg-[#0f1419]`, text `text-slate-200`, accents blue/purple/emerald
- **Glass morphism**: `glass-panel` class (rgba background + backdrop-blur + border)
- **CSS Modules**: Only for `GlowingBorder.module.css` — everything else is Tailwind inline
- **Framer Motion**: Used for page transitions (`AnimatePresence`), tab indicators (`layoutId`), boot animation
- **No CSS-in-JS** libraries

### Imports

```typescript
// Order: React → third-party → local components → local services → types → constants
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, FileCode } from 'lucide-react';
import SomeComponent from './components/SomeComponent';
import { SomeService } from './services/someService';
import { SomeType } from './types';
import { SOME_CONSTANT } from './constants';
```

### Services and Classes

- **Class-based services**: `DxfService`, `GCodeService`, `NestingService`, `CADEngine`, `AdvancedNestingEngine`
- **Pattern**: Constructor with config, public methods for operations, private helpers
- **Config merging**: `{ ...DEFAULT_CONFIG, ...customConfig }` spread pattern
- **Barrel exports**: `index.ts` files in `components/nesting/` and `services/nesting/`

### Error Handling

- **try/catch** with console.error logging: `console.error('[Context] message', error)`
- **Emoji prefixed logs**: `console.log('📄 File:', name)`, `console.log('✓ Success')`, `console.error('✗ Failed')`
- **User-facing errors**: Set via state `setError("message")`, displayed in UI
- **No global error boundary** — errors handled per-component

### Comments and Documentation

- **Section headers**: `// ============ SECTION NAME ============` (block separators)
- **File headers**: Multi-line `// ============================================================` blocks with title
- **Vietnamese comments** are common inline (e.g., `// Bộ nhớ đệm lưu IP để chống spam`)
- **JSDoc**: Used on public service methods, not on components
- **No excessive commenting** — code is expected to be self-documenting

### Environment Variables

- **Vite env**: Access via `process.env.GEMINI_API_KEY` (defined in vite.config.ts)
- **Backend env**: `VITE_NESTING_API_URL` for Python API URL
- **`.env.local`** for secrets (gitignored), `.env.example` as template
### Common Code Patterns

**Component with state + effect**:
```typescript
interface MyComponentProps {
  title: string;
  onSelect?: (id: string) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onSelect }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback((id: string) => {
    setSelected(id);
    onSelect?.(id);
  }, [onSelect]);

  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup
    };
  }, [selected]);

  return <div>...</div>;
};

export default MyComponent;
```

**Error handling in service**:
```typescript
try {
  const result = await someAsyncOperation();
  console.log('✓ Operation succeeded');
  return result;
} catch (error) {
  console.error('[MyService] Operation failed:', error);
  throw new Error(`Failed to do X: ${error instanceof Error ? error.message : 'unknown error'}`);
}
```

**Type-safe null checks**:
```typescript
// GOOD: Handle nulls defensively
if (!data) return null;
if (!data.items || data.items.length === 0) return <Empty />;

// BAD: Don't use `as any` or `!` assertions
const id = data.id as any; // ❌ Avoid
const x = data?.x!; // ❌ Avoid
```



---

## Key Domain Knowledge

This is a **CNC sheet-metal nesting tool**. Key concepts:
- **Nesting**: Optimal arrangement of parts on sheet material to minimize waste
- **DXF**: CAD drawing format — entities are LINE, ARC, CIRCLE, POLYLINE, LWPOLYLINE
- **GCode**: CNC machine instructions (G0=rapid, G1=linear cut, G2/G3=arc)
- **Sheet**: Material plate with width x height x thickness
- **Part**: Component to cut — has geometry, quantity, rotation rules
- **Efficiency/Utilization**: Percentage of sheet area used by parts
- **Gap/Kerf**: Space between parts (cutting tool width)

Detailed domain knowledge is in `SKILL/nesting-domain.md`.

---

## Important Gotchas

1. **Tailwind is CDN-loaded** — no `tailwind.config.js`, no purging, no custom config. All utility classes are available at runtime.
2. **importmap in index.html** has different versions than package.json — Vite handles local dev; importmap is for potential CDN fallback.
3. **Two nesting systems coexist**: `components/nesting/` (legacy) and `components/NestingAX/` (new). NestingAX is the active one.
4. **GCodeViewer.tsx is massive** — it is the largest component with Three.js 3D rendering, editor, themes, AI analysis. Be careful with changes.
5. **No linter or formatter** — be consistent with existing code style manually.
6. **Vietnamese is the primary language** — UI strings, comments, and variable naming may use Vietnamese.
7. **localStorage used as database** in NestingAX (`services/db.ts`) — not a real backend DB.
8. **Discord webhooks** in server.js are hardcoded — treat as configuration, not secrets (they are public-facing).