import { GCodeCommand } from '@/types';
import { GCodeTimelineSampler, TimelineFrame } from '@/services/gcodeTimelineSampler';
import { DEFAULT_WEBM_ENCODER_CONFIG, WebMEncoder, WebMEncoderConfig } from '@/services/WebMEncoder';

export interface OfflineRendererProgress {
  frame: number;
  time: number;
  index: number;
  progress: number;
  isFinished: boolean;
  encodedFrames: number;
  encodeQueueSize: number;
}

export interface RenderVideoOfflineParams<TState = unknown> {
  commands: GCodeCommand[];
  initialSpeed: number;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  onProgress?: (progress: OfflineRendererProgress) => void;

  fps?: number;
  encoderConfig?: Partial<WebMEncoderConfig>;

  captureState?: () => TState | Promise<TState>;

  applyFrameState?: (frame: TimelineFrame) => void | Promise<void>;

  renderScene?: () => void | Promise<void>;

  restoreState?: (state: TState) => void | Promise<void>;

  yieldEveryFrames?: number;
  yieldDelayMs?: number;

  forceYieldOnBackpressure?: boolean;
  backpressureYieldThreshold?: number;
}

const MICROS_PER_SECOND = 1_000_000;
const DEFAULT_YIELD_EVERY_FRAMES = 8;

export async function renderVideoOffline<TState = unknown>(params: RenderVideoOfflineParams<TState>): Promise<Blob> {
  const {
    commands,
    initialSpeed,
    canvas,
    onProgress,
    fps,
    encoderConfig,
    captureState,
    applyFrameState,
    renderScene,
    restoreState,
    yieldEveryFrames = DEFAULT_YIELD_EVERY_FRAMES,
    yieldDelayMs = 0,
    forceYieldOnBackpressure = true,
    backpressureYieldThreshold
  } = params;

  const frameRate = fps && fps > 0 ? fps : DEFAULT_WEBM_ENCODER_CONFIG.frameRate;
  const sampler = new GCodeTimelineSampler({
    commands,
    initialSpeed,
    fps: frameRate
  });

  const encoder = new WebMEncoder({
    width: canvas.width,
    height: canvas.height,
    frameRate,
    ...encoderConfig
  });
  const effectiveMaxEncodeQueueSize = encoderConfig?.maxEncodeQueueSize ?? DEFAULT_WEBM_ENCODER_CONFIG.maxEncodeQueueSize;
  const resolvedBackpressureThreshold = backpressureYieldThreshold ?? Math.max(1, effectiveMaxEncodeQueueSize - 1);

  let encodedFrames = 0;
  let resultBlob: Blob | null = null;
  let thrownError: Error | null = null;
  let stateSnapshot: TState | undefined;

  try {
    if (captureState) {
      stateSnapshot = await captureState();
    }

    while (true) {
      const frame = sampler.nextFrame();

      if (applyFrameState) {
        await applyFrameState(frame);
      }

      if (renderScene) {
        await renderScene();
      }

      await encoder.addFrame(canvas, frame.time * MICROS_PER_SECOND);
      encodedFrames += 1;

      if (onProgress) {
        onProgress({
          frame: frame.frame,
          time: frame.time,
          index: frame.index,
          progress: frame.progress,
          isFinished: frame.isFinished,
          encodedFrames,
          encodeQueueSize: encoder.encodeQueueSize
        });
      }

      if (frame.isFinished) {
        break;
      }

      const shouldYieldByFrameCount = yieldEveryFrames > 0 && encodedFrames % yieldEveryFrames === 0;
      const shouldYieldByQueueFull = encoder.encodeQueueSize >= effectiveMaxEncodeQueueSize;
      const shouldYieldByBackpressure = forceYieldOnBackpressure && encoder.encodeQueueSize >= resolvedBackpressureThreshold;

      if (shouldYieldByFrameCount || shouldYieldByBackpressure || shouldYieldByQueueFull) {
        await delay(yieldDelayMs);
      }
    }

    resultBlob = await encoder.finish();
  } catch (error) {
    thrownError = toError(error);

    try {
      await encoder.finish();
    } catch (finalizeError) {
      const finalizeMessage = toError(finalizeError).message;
      thrownError = new Error(`${thrownError.message} (also failed to finalize encoder: ${finalizeMessage})`);
    }
  } finally {
    if (restoreState && stateSnapshot !== undefined) {
      await restoreState(stateSnapshot);
    }
  }

  if (thrownError) {
    throw thrownError;
  }

  if (!resultBlob) {
    throw new Error('[offlineRenderer] Failed to produce output blob');
  }

  return resultBlob;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
