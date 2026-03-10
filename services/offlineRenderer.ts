/**
 * @deprecated This module is deprecated. Use TurboExportEngine instead.
 * TurboExportEngine provides significantly better performance with:
 * - Pre-baked geometry (compute all paths upfront)
 * - Frame skipping for ultra-long files (>100k lines)
 * - Batched rendering with minimal yields
 * - Large encoder queue for smooth pipeline
 * 
 * Migration: Replace `renderVideoOffline()` with `turboExportVideo()` from '@/services/TurboExportEngine'
 */

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

export interface OfflineRenderSurface<TSnapshot = unknown> {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  renderFrame: (frame: TimelineFrame, snapshot: TSnapshot | undefined) => void | Promise<void>;
  dispose?: () => void | Promise<void>;
}

export interface RenderVideoOfflineParams<TSnapshot = unknown> {
  commands: GCodeCommand[];
  initialSpeed: number;
  canvas?: OffscreenCanvas | HTMLCanvasElement;
  onProgress?: (progress: OfflineRendererProgress) => void;

  fps?: number;
  encoderConfig?: Partial<WebMEncoderConfig>;

  snapshot?: TSnapshot;

  createRenderSurface?: (snapshot: TSnapshot | undefined) => OfflineRenderSurface<TSnapshot> | Promise<OfflineRenderSurface<TSnapshot>>;

  applyFrameState?: (frame: TimelineFrame, snapshot: TSnapshot | undefined) => void | Promise<void>;

  renderScene?: (snapshot: TSnapshot | undefined) => void | Promise<void>;

  restoreState?: (snapshot: TSnapshot) => void | Promise<void>;

  yieldEveryFrames?: number;
  yieldDelayMs?: number;

  forceYieldOnBackpressure?: boolean;
  backpressureYieldThreshold?: number;
}

const DEFAULT_YIELD_EVERY_FRAMES = 120; // Massively yield less. Only pause every 120 frames (2 seconds of 60fps video).

export async function renderVideoOffline<TSnapshot = unknown>(params: RenderVideoOfflineParams<TSnapshot>): Promise<Blob> {
  const {
    commands,
    initialSpeed,
    canvas,
    onProgress,
    fps,
    encoderConfig,
    snapshot,
    createRenderSurface,
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

  const surface = createRenderSurface ? await createRenderSurface(snapshot) : null;
  const renderCanvas = surface?.canvas ?? canvas;

  if (!renderCanvas) {
    throw new Error('[offlineRenderer] Missing render canvas. Provide `canvas` or `createRenderSurface`.');
  }

  const encoder = new WebMEncoder({
    width: renderCanvas.width,
    height: renderCanvas.height,
    frameRate,
    ...encoderConfig
  });
  const effectiveMaxEncodeQueueSize = encoderConfig?.maxEncodeQueueSize ?? DEFAULT_WEBM_ENCODER_CONFIG.maxEncodeQueueSize;
  const resolvedBackpressureThreshold = backpressureYieldThreshold ?? Math.max(1, effectiveMaxEncodeQueueSize - 1);

  let encodedFrames = 0;
  let resultBlob: Blob | null = null;
  let thrownError: Error | null = null;
  try {
    while (true) {
      const frame = sampler.nextFrame();

      if (surface) {
        await surface.renderFrame(frame, snapshot);
      } else {
        if (applyFrameState) {
          await applyFrameState(frame, snapshot);
        }

        if (renderScene) {
          await renderScene(snapshot);
        }
      }

      await encoder.addFrame(renderCanvas, frame.timestampMicros, frame.durationMicros);
      encodedFrames += 1;

      if (onProgress) {
        onProgress({
          frame: frame.frame,
          time: frame.outputTime,
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
    if (surface?.dispose) {
      await surface.dispose();
    }

    if (restoreState && snapshot !== undefined) {
      await restoreState(snapshot);
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
