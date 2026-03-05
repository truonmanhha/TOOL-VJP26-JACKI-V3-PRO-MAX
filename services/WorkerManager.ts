// ============================================================
// WORKER MANAGER - Centralized Web Worker Pool Management
// Handles: DXF parsing, nesting computation, timeouts
// ============================================================

import { pointsToTypedArray, typedArrayToPoints } from './nesting/geometry';

/**
 * Standardized Worker message response shape
 */
export interface WorkerMessage<T = any> {
  type: 'success' | 'error' | 'progress';
  payload?: T;
  error?: string;
  progress?: number;
}

/**
 * Worker pool entry tracking
 */
interface PoolEntry {
  worker: Worker;
  busy: boolean;
  id: string;
}

/**
 * Pending request tracking for timeout handling
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  poolId: string;
}

/**
 * WorkerManager Configuration
 */
export interface WorkerManagerConfig {
  dxfPoolSize?: number;
  nestingPoolSize?: number;
  defaultTimeout?: number; // milliseconds
  debug?: boolean;
}

const DEFAULT_CONFIG: WorkerManagerConfig = {
  dxfPoolSize: 2,
  nestingPoolSize: 2,
  defaultTimeout: 30000, // 30 seconds
  debug: false
};

/**
 * WorkerManager - Manages a pool of Web Workers for parallel tasks
 */
export class WorkerManager {
  private config: WorkerManagerConfig;
  private dxfPool: PoolEntry[] = [];
  private nestingPool: PoolEntry[] = [];
  private pendingRequests = new Map<string, PendingRequest>();

  constructor(config: Partial<WorkerManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._initializePools();
  }

  /**
   * Initialize worker pools
   */
  private _initializePools(): void {
    // DXF Worker Pool
    for (let i = 0; i < (this.config.dxfPoolSize ?? 2); i++) {
      try {
        const worker = new Worker(new URL('../workers/dxf.worker.ts', import.meta.url), {
          type: 'module'
        });
        this.dxfPool.push({
          worker,
          busy: false,
          id: `dxf-${i}`
        });
      } catch (error) {
        console.error('[WorkerManager] Failed to create DXF worker:', error);
      }
    }

    // Nesting Worker Pool
    for (let i = 0; i < (this.config.nestingPoolSize ?? 2); i++) {
      try {
        const worker = new Worker(new URL('../workers/nesting.worker.ts', import.meta.url), {
          type: 'module'
        });
        this.nestingPool.push({
          worker,
          busy: false,
          id: `nesting-${i}`
        });
      } catch (error) {
        console.error('[WorkerManager] Failed to create nesting worker:', error);
      }
    }

    if (this.config.debug) {
      console.log(`✓ WorkerManager initialized: ${this.dxfPool.length} DXF workers, ${this.nestingPool.length} nesting workers`);
    }
  }

  /**
   * Get an available worker from pool
   */
  private _getAvailableWorker(pool: PoolEntry[]): PoolEntry | null {
    // First try to find idle worker
    const idle = pool.find(e => !e.busy);
    if (idle) {
      idle.busy = true;
      return idle;
    }

    // If all busy, wait for first to become available (future enhancement)
    return null;
  }

  /**
   * Release worker back to pool
   */
  private _releaseWorker(poolId: string): void {
    for (const pool of [this.dxfPool, this.nestingPool]) {
      const entry = pool.find(e => e.id === poolId);
      if (entry) {
        entry.busy = false;
        return;
      }
    }
  }

  /**
   * Generate unique request ID
   */
  private _generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

/**
   * Execute a task on a worker with timeout and error handling
   * @param pool Worker pool to use
   * @param message Message to send to worker
   * @param timeout Task timeout in milliseconds
   * @param onProgress Optional progress callback
   * @param transferList Optional Transferable objects for zero-copy (ArrayBuffer list)
   */
  private _executeWorkerTask<T>(
    pool: PoolEntry[],
    message: any,
    timeout: number = this.config.defaultTimeout ?? 30000,
    onProgress?: (progress: any) => void,
    transferList: ArrayBuffer[] = []
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const entry = this._getAvailableWorker(pool);

      if (!entry) {
        reject(new Error('No available workers in pool'));
        return;
      }

      const requestId = this._generateRequestId();
      const timeoutHandle = setTimeout(() => {
        this._releaseWorker(entry.id);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Worker task timeout after ${timeout}ms`));
      }, timeout);

      const pendingRequest: PendingRequest = {
        resolve,
        reject,
        timeout: timeoutHandle,
        poolId: entry.id
      };

      this.pendingRequests.set(requestId, pendingRequest);

      // Setup one-time message handler
      const messageHandler = (event: MessageEvent<WorkerMessage<T>>) => {
        const response = event.data;

        if (response.type === 'success') {
          clearTimeout(timeoutHandle);
          entry.worker.removeEventListener('message', messageHandler);
          entry.worker.removeEventListener('error', errorHandler);
          this._releaseWorker(entry.id);
          this.pendingRequests.delete(requestId);
          resolve(response.payload as T);
        } else if (response.type === 'error') {
          clearTimeout(timeoutHandle);
          entry.worker.removeEventListener('message', messageHandler);
          entry.worker.removeEventListener('error', errorHandler);
          this._releaseWorker(entry.id);
          this.pendingRequests.delete(requestId);
          reject(new Error(response.error || 'Worker error'));
        } else if (response.type === 'progress') {
          // Progress update - keep listening
          if (onProgress && response.progress) {
            onProgress(response.progress);
          }
          if (this.config.debug) {
            console.log(`[WorkerManager] Progress: ${(response.progress as any) || '0'}%`);
          }
        }
      };

      const errorHandler = (error: ErrorEvent) => {
        clearTimeout(timeoutHandle);
        entry.worker.removeEventListener('message', messageHandler);
        entry.worker.removeEventListener('error', errorHandler);
        this._releaseWorker(entry.id);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Worker error: ${error.message}`));
      };

      entry.worker.addEventListener('message', messageHandler);
      entry.worker.addEventListener('error', errorHandler);

      // Send message with request ID for tracking
      // Use Transferable list for zero-copy transfer if provided
      if (transferList.length > 0) {
        entry.worker.postMessage(
          { ...message, requestId },
          transferList
        );
      } else {
        entry.worker.postMessage({
          ...message,
          requestId
        });
      }
    });
  }

  /**
   * Parse DXF file using worker pool
   */
  async parseDxf(fileText: string, fileName: string): Promise<any> {
    if (this.config.debug) {
      console.log(`📄 Parsing DXF: ${fileName}`);
    }

    return this._executeWorkerTask(
      this.dxfPool,
      { fileText, fileName, type: 'DXF' }
    );
  }

  /**
   * Execute nesting on worker pool with progress callback
   */
  async executeNesting(input: {
      parts: any[];
      sheets: any[];
      config?: any;
    },
    onProgress?: (progress: any) => void
  ): Promise<any> {
    if (this.config.debug) {
      console.log(`🧮 Nesting: ${input.parts.length} parts, ${input.sheets.length} sheets`);
    }

    return this._executeWorkerTask(
      this.nestingPool,
      { ...input, type: 'NEST' },
      this.config.defaultTimeout,
      onProgress
    );
  }

  /**
   * Simplify geometries using worker pool (Zero-copy Transferables)
   * Converts Point2D[] geometries to Float32Array buffers for efficient transfer
   */
  async simplifyGeometries(entities: any[]): Promise<any[]> {
    if (this.config.debug) {
      console.log(`✂️ Simplifying ${entities.length} geometries with zero-copy transfer`);
    }

    // ============ CONVERT GEOMETRIES TO TRANSFERABLES ============
    // Convert Point2D[] arrays to Float32Array buffers
    const transferBuffers: ArrayBuffer[] = [];
    const entitiesWithBuffers = entities.map(ent => {
      const bufferEntity = { ...ent };
      
      // Convert points to Float32Array if they exist
      if (ent.points && Array.isArray(ent.points) && ent.points.length > 0) {
        const typedArray = pointsToTypedArray(ent.points);
        bufferEntity.points = typedArray; // Store as Float32Array
        transferBuffers.push(typedArray.buffer); // Add buffer to transfer list
      }
      
      return bufferEntity;
    });

    // ============ EXECUTE WITH TRANSFER LIST ============
    return this._executeWorkerTask(
      this.dxfPool,
      { type: 'SIMPLIFY', entities: entitiesWithBuffers },
      this.config.defaultTimeout,
      undefined,
      transferBuffers // Pass transfer list for zero-copy
    ).then((result: any) => {
      // Convert buffers back to Point2D[] for UI compatibility
      if (result.optimizedEntities && Array.isArray(result.optimizedEntities)) {
        return result.optimizedEntities.map((ent: any) => {
          if (ent.points instanceof Float32Array) {
            // Convert Float32Array back to Point2D[] for rendering
            ent.points = typedArrayToPoints(ent.points);
          }
          return ent;
        });
      }
      return result.optimizedEntities || [];
    });
  }

  /**
   * Cleanup - terminate all workers
   */
  terminate(): void {
    // Clear pending requests
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(new Error('WorkerManager terminated'));
    }
    this.pendingRequests.clear();

    // Terminate all workers
    for (const entry of [...this.dxfPool, ...this.nestingPool]) {
      entry.worker.terminate();
    }

    this.dxfPool = [];
    this.nestingPool = [];

    if (this.config.debug) {
      console.log('✓ WorkerManager terminated');
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    dxf: { total: number; busy: number };
    nesting: { total: number; busy: number };
    pending: number;
  } {
    return {
      dxf: {
        total: this.dxfPool.length,
        busy: this.dxfPool.filter(e => e.busy).length
      },
      nesting: {
        total: this.nestingPool.length,
        busy: this.nestingPool.filter(e => e.busy).length
      },
      pending: this.pendingRequests.size
    };
  }
}

export default WorkerManager;
