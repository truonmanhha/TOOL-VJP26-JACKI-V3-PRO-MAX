export interface AXPerformanceRuntime {
  spatialIndexEnabled: boolean;
  renderCacheEnabled: boolean;
  dirtyRedrawEnabled: boolean;
  workerizedProcessingEnabled: boolean;
}

export function createAXPerformanceRuntime(): AXPerformanceRuntime {
  return {
    spatialIndexEnabled: false,
    renderCacheEnabled: false,
    dirtyRedrawEnabled: false,
    workerizedProcessingEnabled: false,
  };
}
