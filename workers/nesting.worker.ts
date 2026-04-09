// ============================================================
// NESTING WORKER - NestingAX Nesting Engine Web Worker
// Runs nesting computations off main thread with progress reporting
// ============================================================

/**
 * Standardized worker message interface
 */
interface WorkerMessage<T = any> {
  type: 'success' | 'error' | 'progress';
  payload?: T;
  error?: string;
  progress?: any;
  requestId?: string;
}

interface NestingResult {
  partId: string;
  sheetId: string;
  x: number;
  y: number;
  rotation: number;
  nested: boolean;
}

interface NestingProgressData {
  percent: number;
  status: string;
  partsPlaced: number;
  totalParts: number;
  sheetsUsed: number;
  utilization: number;
  currentSheetW: number;
  currentSheetH: number;
  lastPlacement?: any;
}

/**
 * Parse dimensions string "100x200" -> {w: 100, h: 200}
 */
function parseDim(dim: string): { w: number; h: number } {
  const [w, h] = dim.toLowerCase().split('x').map(s => parseFloat(s.trim()));
  return { w: w || 0, h: h || 0 };
}

/**
 * Simple greedy nesting algorithm
 */
function performSimpleNesting(
  parts: any[],
  sheets: any[],
  config: any,
  onProgress: (data: NestingProgressData) => void
): NestingResult[] {
  const results: NestingResult[] = [];
  const gap = config?.gaps?.minGapPath || 2;
  const edgeGap = config?.gaps?.sheetEdgeGap || 10;

  const sheetDim = sheets.length > 0 ? parseDim(sheets[0].dimensions) : { w: 1000, h: 1000 };

  onProgress({
    percent: 5,
    status: 'Starting nesting...',
    partsPlaced: 0,
    totalParts: parts.length,
    sheetsUsed: 1,
    utilization: 0,
    currentSheetW: sheetDim.w,
    currentSheetH: sheetDim.h,
  });

  // Simulate nesting by placing parts in simple grid
  let x = edgeGap;
  let y = edgeGap;
  let sheetIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partDim = parseDim(part.dimensions);

    // Check if part fits on current sheet
    if (x + partDim.w + gap > sheetDim.w) {
      x = edgeGap;
      y += partDim.h + gap;
    }

    if (y + partDim.h + edgeGap > sheetDim.h) {
      // Move to next sheet
      sheetIndex++;
      x = edgeGap;
      y = edgeGap;
    }

    const sheetId = sheets[Math.min(sheetIndex, sheets.length - 1)]?.id || `sheet-${sheetIndex}`;

    results.push({
      partId: part.id,
      sheetId,
      x,
      y,
      rotation: 0,
      nested: true,
    });

    x += partDim.w + gap;

    // Report progress
    const progress = Math.round(10 + ((i + 1) / parts.length) * 85);
    onProgress({
      percent: progress,
      status: `Placing part ${i + 1}/${parts.length}...`,
      partsPlaced: i + 1,
      totalParts: parts.length,
      sheetsUsed: sheetIndex + 1,
      utilization: Math.round(((i + 1) / parts.length) * 100),
      currentSheetW: sheetDim.w,
      currentSheetH: sheetDim.h,
    });
  }

  onProgress({
    percent: 100,
    status: 'Nesting complete.',
    partsPlaced: results.length,
    totalParts: parts.length,
    sheetsUsed: sheetIndex + 1,
    utilization: Math.round((results.length / parts.length) * 100),
    currentSheetW: sheetDim.w,
    currentSheetH: sheetDim.h,
  });

  return results;
}

// ============ WORKER MESSAGE HANDLER ============

const _self = self as unknown as Worker;

_self.onmessage = async (event: MessageEvent<any>) => {
  const { type, requestId, parts, sheets, config } = event.data;

  // Send response with same requestId
  const sendResponse = <T,>(response: WorkerMessage<T>) => {
    _self.postMessage({
      ...response,
      requestId,
    });
  };

  try {
    if (type !== 'NEST') {
      sendResponse({
        type: 'error',
        error: `Unknown message type: ${type}`,
      });
      return;
    }

    // Validate input
    if (!parts || !Array.isArray(parts)) {
      sendResponse({
        type: 'error',
        error: 'Missing or invalid parts array',
      });
      return;
    }

    if (!sheets || !Array.isArray(sheets)) {
      sendResponse({
        type: 'error',
        error: 'Missing or invalid sheets array',
      });
      return;
    }

    // Execute nesting with progress callback
    const results = performSimpleNesting(parts, sheets, config, (progressData) => {
      sendResponse<NestingProgressData>({
        type: 'progress',
        progress: progressData,
      });
    });

    // Send success response with result
    sendResponse<NestingResult[]>({
      type: 'success',
      payload: results,
    });
  } catch (error: any) {
    console.error('[nesting.worker] Error:', error);
    sendResponse({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error in nesting worker',
    });
  }
};

// Explicit export for worker context
export {};
