// ============================================================
// Undo/Redo Manager — Command Pattern for NestingAX
// Session-only (not persisted to localStorage)
// ============================================================

export interface UndoAction {
  type: 'draw' | 'edit' | 'delete' | 'settings';
  before: any;
  after: any;
  entityIds?: string[];
  description: string;
  timestamp: number;
}

const MAX_STACK_SIZE = 100;

class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private listeners: Set<() => void> = new Set();
  private applyCallback: ((state: any, direction: 'undo' | 'redo') => void) | null = null;

  /** Register a callback that applies the undo/redo state (e.g. setCadEntities). */
  registerApplyCallback(cb: (state: any, direction: 'undo' | 'redo') => void): () => void {
    this.applyCallback = cb;
    return () => { this.applyCallback = null; };
  }

  /** Push a new action onto the undo stack. Clears redo stack. */
  push(action: Omit<UndoAction, 'timestamp'>): void {
    const fullAction: UndoAction = {
      ...action,
      timestamp: Date.now()
    };
    this.undoStack.push(fullAction);
    // Enforce max stack size
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack.splice(0, this.undoStack.length - MAX_STACK_SIZE);
    }
    // Clear redo stack on new action
    this.redoStack = [];
    this.notify();
  }

  /** Undo the last action. Returns the action (with before state) or null. */
  undo(): UndoAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    this.redoStack.push(action);
    if (this.applyCallback) {
      this.applyCallback(action.before, 'undo');
    }
    this.notify();
    return action;
  }

  /** Redo the last undone action. Returns the action (with after state) or null. */
  redo(): UndoAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.undoStack.push(action);
    if (this.applyCallback) {
      this.applyCallback(action.after, 'redo');
    }
    this.notify();
    return action;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string {
    if (this.undoStack.length === 0) return '';
    return this.undoStack[this.undoStack.length - 1].description;
  }

  getRedoDescription(): string {
    if (this.redoStack.length === 0) return '';
    return this.redoStack[this.redoStack.length - 1].description;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  /** Clear all undo/redo history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  /** Subscribe to state changes for UI updates */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }
}

// Singleton export
export const undoManager = new UndoManager();
export default undoManager;
