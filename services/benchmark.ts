import { renderVideoOffline } from '@/services/offlineRenderer';
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
const BENCHMARK_FPS = 60;

export async function runRenderBenchmark(): Promise<RenderBenchmarkResult> {
  ensureBrowserBenchmarkSupport();

  const canvas = new OffscreenCanvas(BENCHMARK_WIDTH, BENCHMARK_HEIGHT);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('[benchmark] Failed to create 2D context for OffscreenCanvas');
  }

  const commands = createDummyCommands(BENCHMARK_COMMANDS);

  let encodedFrames = 0;

  const start = performance.now();
  const blob = await renderVideoOffline({
    commands,
    initialSpeed: 1,
    canvas,
    fps: BENCHMARK_FPS,
    yieldEveryFrames: 8,
    yieldDelayMs: 0,
    onProgress: progress => {
      encodedFrames = progress.encodedFrames;
    },
    applyFrameState: frame => {
      const x = ((frame.position.x + 100) / 200) * BENCHMARK_WIDTH;
      const y = ((frame.position.y + 60) / 120) * BENCHMARK_HEIGHT;

      context.fillStyle = '#05070b';
      context.fillRect(0, 0, BENCHMARK_WIDTH, BENCHMARK_HEIGHT);

      context.strokeStyle = frame.isRapid ? '#60a5fa' : '#34d399';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(BENCHMARK_WIDTH, y);
      context.stroke();

      context.fillStyle = '#f8fafc';
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
    }
  });
  const end = performance.now();

  const totalMs = end - start;
  const totalSeconds = totalMs / 1000;
  const avgFps = totalSeconds > 0 ? encodedFrames / totalSeconds : 0;
  const videoDurationSeconds = encodedFrames / BENCHMARK_FPS;
  const realtimeFactor = totalSeconds > 0 ? videoDurationSeconds / totalSeconds : 0;

  console.log('[benchmark] Offline render finished', {
    totalMs: Number(totalMs.toFixed(2)),
    encodedFrames,
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
