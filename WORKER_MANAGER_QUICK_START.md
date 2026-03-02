# Quick Integration Guide - WorkerManager

## How to Use in Your Components

### 1. Create a Service Instance

```typescript
// In your service or context
import { WorkerManager } from '@/services/WorkerManager';

export class NestingService {
  private workerManager: WorkerManager;

  constructor() {
    this.workerManager = new WorkerManager({
      nestingPoolSize: 4,
      defaultTimeout: 60000, // 1 minute for complex nesting
      debug: false
    });
  }

  async runNesting(parts: PartInput[], sheets: SheetInput[]) {
    try {
      const result = await this.workerManager.executeNesting({
        parts,
        sheets,
        config: { strategy: 'BALANCED' }
      });
      return result;
    } catch (error) {
      console.error('Nesting failed:', error);
      throw error;
    }
  }

  cleanup() {
    this.workerManager.terminate();
  }
}
```

### 2. Use in React Component

```typescript
import { useState, useEffect, useRef } from 'react';
import { NestingService } from '@/services/NestingService';

export function NestingPanel() {
  const [nestingResult, setNestingResult] = useState(null);
  const [isNesting, setIsNesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const serviceRef = useRef<NestingService | null>(null);

  useEffect(() => {
    serviceRef.current = new NestingService();
    return () => {
      serviceRef.current?.cleanup();
    };
  }, []);

  async function handleStartNesting(parts: PartInput[], sheets: SheetInput[]) {
    if (!serviceRef.current) return;

    setIsNesting(true);
    setProgress(0);

    try {
      const result = await serviceRef.current.runNesting(parts, sheets);
      setNestingResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Nesting error:', error);
    } finally {
      setIsNesting(false);
    }
  }

  return (
    <div className="nesting-panel">
      {isNesting && <div className="progress">{progress}%</div>}
      {nestingResult && <NestingVisualization result={nestingResult} />}
    </div>
  );
}
```

### 3. Use with DXF Parsing

```typescript
async function loadDxfFile(file: File) {
  const fileText = await file.text();
  
  try {
    const result = await workerManager.parseDxf(fileText, file.name);
    console.log('Parsed entities:', result.entities.length);
    return result;
  } catch (error) {
    console.error('DXF parsing failed:', error);
  }
}
```

## Monitoring Pool Performance

```typescript
// Get current pool statistics
const stats = workerManager.getStats();
console.log('DXF Workers:', stats.dxf);      // { total: 2, busy: 1 }
console.log('Nesting Workers:', stats.nesting); // { total: 2, busy: 0 }
console.log('Pending Requests:', stats.pending); // 3

// Use for UI feedback
if (stats.pending > 0) {
  showMessage(`${stats.pending} tasks queued...`);
}
```

## Error Handling Best Practices

```typescript
try {
  const result = await workerManager.executeNesting({...});
} catch (error) {
  if (error.message.includes('timeout')) {
    // Task took too long - increase timeout or simplify input
    console.warn('Nesting task timed out');
  } else if (error.message.includes('available')) {
    // All workers busy - queue or retry
    console.warn('Worker pool exhausted');
  } else {
    // Computation error
    console.error('Nesting computation failed:', error.message);
  }
}
```

## Configuration Recommendations

### For UI-Responsive Nesting
```typescript
new WorkerManager({
  nestingPoolSize: 2,           // Keep main thread free
  defaultTimeout: 30000,        // 30 second limit
  debug: false
})
```

### For Maximum Performance
```typescript
new WorkerManager({
  nestingPoolSize: navigator.hardwareConcurrency || 4, // Use all cores
  defaultTimeout: 120000,       // 2 minute limit
  debug: false
})
```

### For Development/Debugging
```typescript
new WorkerManager({
  nestingPoolSize: 1,
  defaultTimeout: 5000,         // Catch issues quickly
  debug: true                   // Log all operations
})
```

## Migration from Direct Service Calls

### Before (Main Thread Blocking)
```typescript
const engine = new AdvancedNestingEngine(config);
const result = engine.nest(input); // Blocks UI during computation
```

### After (Offloaded to Worker)
```typescript
const manager = new WorkerManager();
const result = await manager.executeNesting({
  parts: input.parts,
  sheets: input.sheets,
  config
}); // UI remains responsive!
```

## Debugging Tips

### Enable Debug Logging
```typescript
const manager = new WorkerManager({ debug: true });
// Console output:
// ✓ WorkerManager initialized: 2 DXF workers, 2 nesting workers
// 📄 Parsing DXF: drawing.dxf
// 🧮 Nesting: 12 parts, 3 sheets
// [WorkerManager] Progress (nesting-0): 50%
```

### Monitor Network Tab (Chrome DevTools)
Workers show up in Network/Workers tab, you can inspect messages in real-time.

### Check Pool Status During Development
```typescript
setInterval(() => {
  const stats = manager.getStats();
  console.table(stats);
}, 1000);
```

---

For detailed implementation info, see: `WEB_WORKER_FOUNDATION_IMPLEMENTATION.md`
