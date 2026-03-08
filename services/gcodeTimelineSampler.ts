import { GCodeCommand } from '@/types';
import { advanceMotion, MotionState } from '@/services/gcodeMotionHelper';

export interface TimelineSamplerOptions {
  commands: GCodeCommand[];
  initialSpeed: number;
  fps?: number;
}

export interface TimelineFrame {
  frame: number;
  time: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  isRapid: boolean;
  isFinished: boolean;
  index: number;
  progress: number;
  dwellRemaining: number;
}

const DEFAULT_FPS = 60;
const EPSILON = 1e-6;

export class GCodeTimelineSampler {
  private readonly commands: GCodeCommand[];
  private readonly fps: number;
  private readonly fixedDelta: number;
  private readonly handledDwellIndices = new Set<number>();

  private playbackSpeed: number;
  private motionState: MotionState;
  private frameIndex = 0;
  private timelineTime = 0;
  private dwellRemaining = 0;
  private finished = false;

  constructor(options: TimelineSamplerOptions) {
    this.commands = options.commands ?? [];
    this.playbackSpeed = options.initialSpeed;
    this.fps = options.fps && options.fps > 0 ? options.fps : DEFAULT_FPS;
    this.fixedDelta = 1 / this.fps;
    this.motionState = {
      index: 0,
      progress: 0,
      lastTime: 0
    };

    if (this.commands.length === 0) {
      this.finished = true;
    }
  }

  public nextFrame(): TimelineFrame {
    if (this.finished && this.dwellRemaining <= EPSILON) {
      return this.buildFrame(true, false);
    }

    const dt = this.fixedDelta;

    if (this.dwellRemaining > EPSILON || this.tryStartDwellAtCurrentIndex()) {
      this.dwellRemaining = Math.max(0, this.dwellRemaining - dt);
      this.timelineTime += dt;
      this.frameIndex += 1;

      if (this.dwellRemaining <= EPSILON) {
        this.dwellRemaining = 0;
      }

      const isFinished = this.isMotionFinished() && this.dwellRemaining <= EPSILON;
      if (isFinished) {
        this.finished = true;
      }

      return this.buildFrame(isFinished, false);
    }

    const result = advanceMotion(this.motionState, this.commands, dt, this.playbackSpeed);
    this.motionState = {
      ...this.motionState,
      index: result.newIndex,
      progress: result.newProgress
    };

    this.timelineTime += dt;
    this.frameIndex += 1;

    const isFinished = result.isFinished && this.dwellRemaining <= EPSILON;
    if (isFinished) {
      this.finished = true;
    }

    const isRapid = this.getSegmentTypeForCurrentState() === 'G0';
    return this.buildFrame(isFinished, isRapid, result.position.x, result.position.y, result.position.z);
  }

  public reset(): void {
    this.motionState = {
      index: 0,
      progress: 0,
      lastTime: 0
    };
    this.frameIndex = 0;
    this.timelineTime = 0;
    this.dwellRemaining = 0;
    this.finished = this.commands.length === 0;
    this.handledDwellIndices.clear();
  }

  private tryStartDwellAtCurrentIndex(): boolean {
    const index = this.motionState.index;
    if (index < 0 || index >= this.commands.length || this.handledDwellIndices.has(index)) {
      return false;
    }

    const dwellSeconds = parseDwellSeconds(this.commands[index].code);
    if (dwellSeconds <= EPSILON) {
      return false;
    }

    this.handledDwellIndices.add(index);
    this.dwellRemaining = dwellSeconds;
    return true;
  }

  private isMotionFinished(): boolean {
    return this.commands.length === 0 || this.motionState.index >= this.commands.length - 1;
  }

  private getSegmentTypeForCurrentState(): GCodeCommand['type'] {
    if (this.commands.length === 0) {
      return 'OTHER';
    }

    const safeIndex = Math.min(this.motionState.index, this.commands.length - 1);
    return this.commands[safeIndex].type;
  }

  private buildFrame(
    isFinished: boolean,
    isRapid: boolean,
    forcedX?: number,
    forcedY?: number,
    forcedZ?: number
  ): TimelineFrame {
    const sampled = advanceMotion(this.motionState, this.commands, 0, this.playbackSpeed);
    const x = forcedX ?? sampled.position.x;
    const y = forcedY ?? sampled.position.y;
    const z = forcedZ ?? sampled.position.z;

    return {
      frame: this.frameIndex,
      time: this.timelineTime,
      position: { x, y, z },
      isRapid,
      isFinished,
      index: this.motionState.index,
      progress: this.motionState.progress,
      dwellRemaining: this.dwellRemaining
    };
  }
}

export function parseDwellSeconds(code: string): number {
  if (!code || !/\bG0?4\b/i.test(code)) {
    return 0;
  }

  const pMatch = code.match(/\bP([+-]?\d*\.?\d+)\b/i);
  if (pMatch) {
    const pValue = Number.parseFloat(pMatch[1]);
    return Number.isFinite(pValue) && pValue > 0 ? pValue / 1000 : 0;
  }

  const xMatch = code.match(/\bX([+-]?\d*\.?\d+)\b/i);
  if (xMatch) {
    const xValue = Number.parseFloat(xMatch[1]);
    return Number.isFinite(xValue) && xValue > 0 ? xValue : 0;
  }

  return 0;
}
