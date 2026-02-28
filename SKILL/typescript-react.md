# TypeScript React Skill - Patterns for Nesting Tool

## Description
TypeScript and React patterns specific to the nesting tool project. Includes state management, component patterns, hooks, and performance optimizations.

## TypeScript Patterns

### Strict Typing
```typescript
// Use strict types, avoid 'any'
interface NestingState {
  parts: NestingPart[];
  sheets: Sheet[];
  placements: Placement[];
  isCalculating: boolean;
  error: string | null;
}

// Use discriminated unions for actions
type NestingAction =
  | { type: 'ADD_PART'; payload: NestingPart }
  | { type: 'REMOVE_PART'; payload: string }
  | { type: 'SET_PLACEMENTS'; payload: Placement[] }
  | { type: 'SET_ERROR'; payload: string | null };

// Type guards
const isNestingPart = (obj: unknown): obj is NestingPart => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'polygon' in obj
  );
};
```

### Interface Definitions
```typescript
// Prefer interfaces for object types
export interface Point2D {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NestingPart {
  id: string;
  name: string;
  polygon: Point2D[];
  quantity: number;
  canRotate: boolean;
  material?: string;
  thickness?: number;
}

// Use type for unions/intersections
type Material = 'steel' | 'aluminum' | 'wood';
type Thickness = 1 | 2 | 3 | 5 | 10 | 20;
```

### Generic Hooks
```typescript
// Generic localStorage hook
const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStored(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key]);

  return [stored, setValue];
};

// Generic async hook
const useAsync = <T>(asyncFunction: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  return { data, loading, error, execute };
};
```

## React Component Patterns

### Compound Components
```typescript
// SheetManager compound component pattern
interface SheetManagerContextValue {
  sheets: Sheet[];
  selectedSheet: string | null;
  addSheet: (sheet: Sheet) => void;
  removeSheet: (id: string) => void;
  selectSheet: (id: string) => void;
}

const SheetManagerContext = createContext<SheetManagerContextValue | null>(null);

const SheetManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const value = useMemo(() => ({
    sheets,
    selectedSheet,
    addSheet: (sheet: Sheet) => setSheets(prev => [...prev, sheet]),
    removeSheet: (id: string) => setSheets(prev => prev.filter(s => s.id !== id)),
    selectSheet: (id: string) => setSelectedSheet(id)
  }), [sheets, selectedSheet]);

  return (
    <SheetManagerContext.Provider value={value}>
      {children}
    </SheetManagerContext.Provider>
  );
};

const SheetList: React.FC = () => {
  const context = useContext(SheetManagerContext);
  if (!context) throw new Error('SheetList must be used within SheetManager');
  
  const { sheets, selectedSheet, selectSheet, removeSheet } = context;
  
  return (
    <div className="sheet-list">
      {sheets.map(sheet => (
        <div
          key={sheet.id}
          className={`sheet-item ${selectedSheet === sheet.id ? 'selected' : ''}`}
          onClick={() => selectSheet(sheet.id)}
        >
          <span>{sheet.name}</span>
          <button onClick={() => removeSheet(sheet.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
};

const SheetForm: React.FC = () => {
  const context = useContext(SheetManagerContext);
  if (!context) throw new Error('SheetForm must be used within SheetManager');
  
  const { addSheet } = context;
  const [formData, setFormData] = useState({ name: '', width: 0, height: 0 });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSheet({
      id: crypto.randomUUID(),
      ...formData
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};

SheetManager.List = SheetList;
SheetManager.Form = SheetForm;
```

### Render Props Pattern
```typescript
// Canvas render prop for custom rendering
interface CanvasProps {
  width: number;
  height: number;
  children: (ctx: CanvasRenderingContext2D) => void;
}

const Canvas: React.FC<CanvasProps> = ({ width, height, children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    children(ctx);
  }, [children]);
  
  return <canvas ref={canvasRef} width={width} height={height} />;
};

// Usage
<Canvas width={800} height={600}>
  {(ctx) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 800, 600);
    
    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(400, 300, 100, 0, Math.PI * 2);
    ctx.stroke();
  }}
</Canvas>
```

### Custom Hooks

#### useNesting
```typescript
const useNesting = () => {
  const [state, setState] = useState<NestingState>({
    parts: [],
    sheets: [],
    placements: [],
    isCalculating: false,
    error: null
  });

  const addPart = useCallback((part: NestingPart) => {
    setState(prev => ({
      ...prev,
      parts: [...prev.parts, part]
    }));
  }, []);

  const removePart = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.id !== id)
    }));
  }, []);

  const calculateNesting = useCallback(async (algorithm: string) => {
    setState(prev => ({ ...prev, isCalculating: true, error: null }));
    
    try {
      const placements = await runNestingAlgorithm(
        state.parts,
        state.sheets,
        algorithm
      );
      
      setState(prev => ({
        ...prev,
        placements,
        isCalculating: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [state.parts, state.sheets]);

  return {
    ...state,
    addPart,
    removePart,
    calculateNesting
  };
};
```

#### useCanvas
```typescript
const useCanvas = (width: number, height: number) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    setContext(ctx);
  }, [width, height]);

  const clear = useCallback(() => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, width, height);
  }, [context, width, height]);

  const drawRect = useCallback((rect: Rect, color: string) => {
    if (!context) return;
    context.fillStyle = color;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }, [context]);

  return { canvasRef, context, clear, drawRect };
};
```

#### useFileUpload
```typescript
interface UseFileUploadOptions {
  accept?: string;
  multiple?: boolean;
  onFileSelect?: (files: File[]) => void;
}

const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const { accept, multiple = false, onFileSelect } = options;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFileSelect?.(files);
    }
    // Reset input
    event.target.value = '';
  }, [onFileSelect]);

  const FileInput = useCallback(() => (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      onChange={handleChange}
      style={{ display: 'none' }}
    />
  ), [accept, multiple, handleChange]);

  return { handleClick, FileInput };
};
```

## Performance Optimizations

### Memoization
```typescript
// Memoize expensive calculations
const NestingResults: React.FC<{ placements: Placement[] }> = ({ placements }) => {
  const stats = useMemo(() => {
    return placements.reduce((acc, p) => ({
      totalParts: acc.totalParts + 1,
      totalArea: acc.totalArea + p.width * p.height
    }), { totalParts: 0, totalArea: 0 });
  }, [placements]);

  return (
    <div>
      <p>Parts: {stats.totalParts}</p>
      <p>Area: {stats.totalArea}</p>
    </div>
  );
};

// Memoize callbacks
const Toolbar: React.FC<{ onToolSelect: (tool: string) => void }> = ({ onToolSelect }) => {
  const handleSelect = useCallback((tool: string) => {
    onToolSelect(tool);
  }, [onToolSelect]);

  return (
    <div>
      <button onClick={() => handleSelect('select')}>Select</button>
      <button onClick={() => handleSelect('rectangle')}>Rectangle</button>
    </div>
  );
};

// Memoize components
const PartItem = React.memo<PartItemProps>(({ part, onDelete }) => {
  return (
    <div className="part-item">
      <span>{part.name}</span>
      <button onClick={() => onDelete(part.id)}>Delete</button>
    </div>
  );
}, (prev, next) => prev.part.id === next.part.id);
```

### Virtualization
```typescript
// Virtual list for large part lists
import { FixedSizeList as List } from 'react-window';

const VirtualPartList: React.FC<{ parts: NestingPart[] }> = ({ parts }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="part-row">
      <span>{parts[index].name}</span>
      <span>{parts[index].quantity}</span>
    </div>
  );

  return (
    <List
      height={400}
      itemCount={parts.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Code Splitting
```typescript
// Lazy load heavy components
const DXFViewer = lazy(() => import('./components/DXFViewer'));
const GCodePreview = lazy(() => import('./components/GCodePreview'));

const App: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DXFViewer />
      <GCodePreview />
    </Suspense>
  );
};
```

## Error Handling

### Error Boundary
```typescript
interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Async Error Handling
```typescript
const useAsyncError = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleAsync = useCallback(async <T>(
    promise: Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | undefined> => {
    try {
      setError(null);
      const data = await promise;
      onSuccess?.(data);
      return data;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      onError?.(err);
      return undefined;
    }
  }, []);

  return { error, handleAsync, clearError: () => setError(null) };
};
```

## State Management

### Context + Reducer Pattern
```typescript
// State definition
interface AppState {
  parts: NestingPart[];
  sheets: Sheet[];
  placements: Placement[];
  ui: {
    selectedTool: string;
    showGrid: boolean;
    zoom: number;
  };
}

// Actions
type AppAction =
  | { type: 'ADD_PART'; payload: NestingPart }
  | { type: 'REMOVE_PART'; payload: string }
  | { type: 'SET_PLACEMENTS'; payload: Placement[] }
  | { type: 'SET_TOOL'; payload: string }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_ZOOM'; payload: number };

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_PART':
      return { ...state, parts: [...state.parts, action.payload] };
    case 'REMOVE_PART':
      return { ...state, parts: state.parts.filter(p => p.id !== action.payload) };
    case 'SET_PLACEMENTS':
      return { ...state, placements: action.payload };
    case 'SET_TOOL':
      return { ...state, ui: { ...state.ui, selectedTool: action.payload } };
    case 'TOGGLE_GRID':
      return { ...state, ui: { ...state.ui, showGrid: !state.ui.showGrid } };
    case 'SET_ZOOM':
      return { ...state, ui: { ...state.ui, zoom: action.payload } };
    default:
      return state;
  }
};

// Context
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook
const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};
```

## Best Practices

1. **Type Safety**: Use strict TypeScript configuration
2. **Component Size**: Keep components under 200 lines
3. **Props Interface**: Always define Props interface
4. **Return Types**: Explicit return types for exported functions
5. **Error Handling**: Use error boundaries and try-catch
6. **Performance**: Use memoization appropriately
7. **Testing**: Write unit tests for utilities
8. **Accessibility**: Include ARIA labels
9. **Comments**: Document complex algorithms
10. **Consistency**: Follow project code style
