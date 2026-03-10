export type ExportRetimeStrategy = 'fast' | 'density';

export interface ExportPolicyConfig {
  speed: number;
  fps: number;
  strategy: ExportRetimeStrategy;
  playbackSpeed: number;
  frameDensityMultiplier: number;
}

const MIN_SPEED = 0;
const MAX_SPEED = 100;
const FAST_PATH_THRESHOLD = 50;
const BASE_EXPORT_FPS = 30;
const MAX_EXPORT_FPS = 50;
const MIN_FAST_FPS = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toPlaybackSpeed(speed: number): number {
  if (speed <= 40) {
    return 0.1 + (speed / 40) * 1.9;
  }

  // At high speeds, make it exponentially faster so long files finish instantly
  const t = (speed - 40) / 60; // 0.0 to 1.0
  // Instead of maxing at 500x, let's max at 50000x for speed 100!
  // This means the timeline sampler will leap over thousands of lines per frame.
  return 2 + Math.pow(t, 4) * 50000;
}

function toFastPathFps(speed: number): number {
  const normalized = (speed - FAST_PATH_THRESHOLD) / (MAX_SPEED - FAST_PATH_THRESHOLD);
  const fps = BASE_EXPORT_FPS - normalized * (BASE_EXPORT_FPS - MIN_FAST_FPS);
  return Math.round(clamp(fps, MIN_FAST_FPS, BASE_EXPORT_FPS));
}

function toDensityFps(speed: number): number {
  const normalized = (FAST_PATH_THRESHOLD - speed) / FAST_PATH_THRESHOLD;
  const fps = BASE_EXPORT_FPS + normalized * (MAX_EXPORT_FPS - BASE_EXPORT_FPS);
  return Math.round(clamp(fps, BASE_EXPORT_FPS, MAX_EXPORT_FPS));
}

export function getExportConfig(speedInput: number): ExportPolicyConfig {
  const speed = clamp(Number.isFinite(speedInput) ? speedInput : MIN_SPEED, MIN_SPEED, MAX_SPEED);
  const strategy: ExportRetimeStrategy = speed > FAST_PATH_THRESHOLD ? 'fast' : 'density';
  const fps = strategy === 'fast' ? toFastPathFps(speed) : toDensityFps(speed);

  return {
    speed,
    fps,
    strategy,
    playbackSpeed: toPlaybackSpeed(speed),
    frameDensityMultiplier: fps / BASE_EXPORT_FPS
  };
}
