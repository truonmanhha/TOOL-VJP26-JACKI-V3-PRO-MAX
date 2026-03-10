import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface MP4EncoderConfig {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  hardwareAcceleration: HardwareAcceleration;
  keyFrameInterval: number;
  maxEncodeQueueSize: number;
  backpressurePollMs: number;
}

export const DEFAULT_MP4_ENCODER_CONFIG: MP4EncoderConfig = {
  width: 1280,
  height: 720,
  frameRate: 60,
  bitrate: 3_000_000,
  hardwareAcceleration: 'prefer-hardware',
  keyFrameInterval: 60,
  maxEncodeQueueSize: 120,
  backpressurePollMs: 1
};

export class MP4Encoder {
  private config: MP4EncoderConfig;
  private target: ArrayBufferTarget;
  private muxer: Muxer<ArrayBufferTarget>;
  private encoder: VideoEncoder;
  private frameCanvas: OffscreenCanvas | HTMLCanvasElement;
  private frameContext: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

  private frameCount = 0;
  private lastTimestampMicros = -1;
  private encoderError: Error | null = null;
  private isFinishing = false;
  private isFinalized = false;
  private finalizedBlob: Blob | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<MP4EncoderConfig> = {}) {
    this.config = { ...DEFAULT_MP4_ENCODER_CONFIG, ...config };

    if (typeof globalThis.VideoEncoder === 'undefined' || typeof globalThis.VideoFrame === 'undefined') {
      throw new Error('[MP4Encoder] WebCodecs API is not available in this environment');
    }

    const frameSurface = this.createFrameSurface(this.config.width, this.config.height);
    this.frameCanvas = frameSurface.canvas;
    this.frameContext = frameSurface.context;

    this.target = new ArrayBufferTarget();
    this.muxer = new Muxer({
      target: this.target,
      video: {
        codec: 'avc',
        width: this.config.width,
        height: this.config.height
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    });

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.muxer.addVideoChunk(chunk, meta);
      },
      error: (error) => {
        this.encoderError = error instanceof Error ? error : new Error(String(error));
        console.error('[MP4Encoder] VideoEncoder error:', error);
      }
    });

    const initEncoder = async () => {
      const avcCodecs = [
        'avc1.640028', // High profile level 4.0
        'avc1.4D0028', // Main profile level 4.0
        'avc1.42E01E', // Baseline profile level 3.0
        'avc1.42001E'  // Baseline profile
      ];

      for (const codec of avcCodecs) {
        try {
          const config: VideoEncoderConfig = {
            codec,
            width: this.config.width,
            height: this.config.height,
            bitrate: this.config.bitrate,
            framerate: this.config.frameRate,
            hardwareAcceleration: this.config.hardwareAcceleration,
            avc: { format: 'avc' }
          };

          const support = await VideoEncoder.isConfigSupported(config);
          if (support.supported) {
            this.encoder.configure(support.config || config);
            console.log(`[MP4Encoder] Using codec: ${codec}`);
            return;
          }
        } catch (e) {
          continue;
        }
      }

      for (const codec of avcCodecs) {
        try {
          const config: VideoEncoderConfig = {
            codec,
            width: this.config.width,
            height: this.config.height,
            bitrate: this.config.bitrate,
            framerate: this.config.frameRate,
            hardwareAcceleration: 'prefer-software',
            avc: { format: 'avc' }
          };

          const support = await VideoEncoder.isConfigSupported(config);
          if (support.supported) {
            this.encoder.configure(support.config || config);
            console.log(`[MP4Encoder] Using software codec: ${codec}`);
            return;
          }
        } catch (e) {
          continue;
        }
      }

      throw new Error('[MP4Encoder] No supported H.264 codec found');
    };

    this.initPromise = initEncoder();
  }

  private createFrameSurface(width: number, height: number): {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  } {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d', { willReadFrequently: false });
      if (!context) throw new Error('Failed to get OffscreenCanvas 2D context');
      return { canvas, context };
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: false });
      if (!context) throw new Error('Failed to get Canvas 2D context');
      return { canvas, context };
    }
  }

  public async addFrame(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    timestampMicros: number,
    durationMicros?: number
  ): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    this.ensureWritableState();
    await this.waitForBackpressure();
    this.ensureWritableState();

    this.frameContext.drawImage(canvas, 0, 0, this.config.width, this.config.height);

    const resolvedTimestampMicros = this.normalizeTimestampMicros(timestampMicros);
    const resolvedDurationMicros = this.normalizeDurationMicros(durationMicros);

    const frame = new VideoFrame(this.frameCanvas, {
      timestamp: resolvedTimestampMicros,
      duration: resolvedDurationMicros
    });

    try {
      const keyFrame = this.frameCount % this.config.keyFrameInterval === 0;
      this.encoder.encode(frame, { keyFrame });
      this.frameCount += 1;
      this.lastTimestampMicros = resolvedTimestampMicros;
    } finally {
      frame.close();
    }
  }

  public async finish(): Promise<Blob> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    if (this.finalizedBlob) {
      return this.finalizedBlob;
    }

    if (this.isFinishing) {
      while (this.isFinishing && !this.finalizedBlob) {
        await this.delay(this.config.backpressurePollMs);
      }
      if (this.finalizedBlob) {
        return this.finalizedBlob;
      }
    }

    this.ensureWritableState();
    this.isFinishing = true;

    try {
      await this.encoder.flush();
      this.ensureEncoderHealthy();
      this.safeCloseEncoder();
      this.muxer.finalize();

      const buffer = this.target.buffer;
      this.finalizedBlob = new Blob([buffer], { type: 'video/mp4' });
      this.isFinalized = true;
      return this.finalizedBlob;
    } finally {
      this.isFinishing = false;
    }
  }

  private normalizeTimestampMicros(input: number): number {
    const ts = input <= this.lastTimestampMicros ? this.lastTimestampMicros + 1 : input;
    return Math.max(0, Math.round(ts));
  }

  private normalizeDurationMicros(input?: number): number {
    const DEFAULT_DURATION = Math.round(1_000_000 / this.config.frameRate);
    if (input === undefined || input <= 0) return DEFAULT_DURATION;
    return Math.round(input);
  }

  private async waitForBackpressure(): Promise<void> {
    while (this.encoder.encodeQueueSize >= this.config.maxEncodeQueueSize) {
      await this.delay(this.config.backpressurePollMs);
      this.ensureEncoderHealthy();
    }
  }

  private ensureWritableState(): void {
    this.ensureEncoderHealthy();
    if (this.isFinalized) {
      throw new Error('[MP4Encoder] Cannot write after finalization');
    }
  }

  private ensureEncoderHealthy(): void {
    if (this.encoderError) {
      throw this.encoderError;
    }
  }

  private safeCloseEncoder(): void {
    try {
      if (this.encoder.state !== 'closed') {
        this.encoder.close();
      }
    } catch {
      // Ignore
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public dispose(): void {
    this.safeCloseEncoder();
  }
}
