import { turboExportVideoLegacy } from '@/services/TurboExportEngine';
import { GCodeCommand } from '@/types';

interface RenderBenchmarkResult {
  totalMs: number;
  encodedFrames: number;
  avgFps: number;
  realtimeFactor: number;
  outputBytes: number;
}

const BENCHMARK_WIDTH = 1280;
const BENCHMARK_HEIGHT = 720;
const BENCHMARK_COMMANDS = 500;
const BENCHMARK_SPEED = 15;

export async function runRenderBenchmark(): Promise<RenderBenchmarkResult> {
  ensureBrowserBenchmarkSupport();

  const commands = createDummyCommands(BENCHMARK_COMMANDS);

  let encodedFrames = 0;
  let totalFrames = 0;

  const start = performance.now();
  const blob = await turboExportVideoLegacy({
    commands,
    speedSlider: BENCHMARK_SPEED,
    width: BENCHMARK_WIDTH,
    height: BENCHMARK_HEIGHT,
    theme: {
      background: '#0f1419',
      g0: '#00ff00',
      g1: '#3b82f6',
      grid: '#334155'
    },
    viewOptions: {
      showRapid: true,
      showCutting: true
    },
    onProgress: progress => {
      encodedFrames = progress.currentFrame;
      totalFrames = progress.totalFrames;
    }
  });
  const end = performance.now();

  const totalMs = end - start;
  const totalSeconds = totalMs / 1000;
  const avgFps = totalSeconds > 0 ? encodedFrames / totalSeconds : 0;
  const videoDurationSeconds = encodedFrames / 30;
  const realtimeFactor = totalSeconds > 0 ? videoDurationSeconds / totalSeconds : 0;

  console.log('[benchmark] TurboExport render finished', {
    totalMs: Number(totalMs.toFixed(2)),
    encodedFrames,
    totalFrames,
    avgFps: Number(avgFps.toFixed(2)),
    outputBytes: blob.size,
    realtimeFactor: Number(realtimeFactor.toFixed(2))
  });

  return {
    totalMs,
    encodedFrames,
    avgFps,
    realtimeFactor,
    outputBytes: blob.size
  };
}

function createDummyCommands(count: number): GCodeCommand[] {
  const commands: GCodeCommand[] = [];
  let y = -40;

  for (let i = 0; i < count; i += 1) {
    const isEven = i % 2 === 0;
    const x = isEven ? 90 : -90;
    y += 0.16;

    commands.push({
      line: i + 1,
      type: isEven ? 'G1' : 'G0',
      x,
      y,
      z: 0,
      f: isEven ? 3600 : 7200,
      code: `${isEven ? 'G1' : 'G0'} X${x.toFixed(3)} Y${y.toFixed(3)} F${isEven ? 3600 : 7200}`
    });
  }

  return commands;
}

function ensureBrowserBenchmarkSupport(): void {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('[benchmark] OffscreenCanvas is unavailable in this browser');
  }

  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    throw new Error('[benchmark] WebCodecs is unavailable in this browser');
  }
}
