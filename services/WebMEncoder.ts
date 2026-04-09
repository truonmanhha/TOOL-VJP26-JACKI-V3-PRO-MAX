import { ArrayBufferTarget, Muxer } from 'webm-muxer';

export interface WebMEncoderConfig {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  codec: string;
  hardwareAcceleration: HardwareAcceleration;
  keyFrameInterval: number;
  maxEncodeQueueSize: number;
  backpressurePollMs: number;
  mimeType: string;
}

export const DEFAULT_WEBM_ENCODER_CONFIG: WebMEncoderConfig = {
  width: 1280, // Drop down width a bit could help, but let's keep 720p
  height: 720,
  frameRate: 60,
  bitrate: 2_500_000,
  codec: 'vp8', 
  hardwareAcceleration: 'prefer-hardware', 
  keyFrameInterval: 60,
  maxEncodeQueueSize: 120, // MASSIVE BOOST: allow GPU encoder to accept up to 120 frames at once without blocking CPU loop
  backpressurePollMs: 1, // Poll faster to unblock
  mimeType: 'video/webm'
};

export class WebMEncoder {
  private config: WebMEncoderConfig;
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

  constructor(config: Partial<WebMEncoderConfig> = {}) {
    this.config = { ...DEFAULT_WEBM_ENCODER_CONFIG, ...config };

    if (typeof globalThis.VideoEncoder === 'undefined' || typeof globalThis.VideoFrame === 'undefined') {
      throw new Error('[WebMEncoder] WebCodecs API is not available in this environment');
    }

    const frameSurface = this.createFrameSurface(this.config.width, this.config.height);
    this.frameCanvas = frameSurface.canvas;
    this.frameContext = frameSurface.context;

    this.target = new ArrayBufferTarget();
    this.muxer = new Muxer({
      target: this.target,
      video: {
        codec: this.toMuxerCodec(this.config.codec),
        width: this.config.width,
        height: this.config.height,
        frameRate: this.config.frameRate
      },
      firstTimestampBehavior: 'offset'
    });

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        this.muxer.addVideoChunk(chunk, meta);
      },
      error: (error) => {
        this.encoderError = error instanceof Error ? error : new Error(String(error));
        console.error('[WebMEncoder] VideoEncoder error:', error);
      }
    });


    const initEncoder = async () => {
      let config: VideoEncoderConfig = {
        codec: this.config.codec,
        width: this.config.width,
        height: this.config.height,
        bitrate: this.config.bitrate,
        framerate: this.config.frameRate,
        hardwareAcceleration: this.config.hardwareAcceleration
      };

      try {
        const support = await VideoEncoder.isConfigSupported(config);
        if (!support.supported) {
          throw new Error('Config not supported natively');
        }
        this.encoder.configure(support.config || config);
      } catch (e) {
        console.warn('[WebMEncoder] Hardware/VP9 encode failed or not supported, falling back to VP8/CPU:', e);
        
        // Hard fallback to safe vp8 config
        this.config.codec = 'vp8';
        this.muxer = new Muxer({
          target: this.target,
          video: {
            codec: 'V_VP8',
            width: this.config.width,
            height: this.config.height,
            frameRate: this.config.frameRate
          },
          firstTimestampBehavior: 'offset'
        });
        
        const fallbackConfig: VideoEncoderConfig = {
          codec: 'vp8',
          width: this.config.width,
          height: this.config.height,
          bitrate: this.config.bitrate,
          framerate: this.config.frameRate,
          hardwareAcceleration: 'prefer-software'
        };
        
        try {
          // Double check if even fallback is supported
          const fallbackSupport = await VideoEncoder.isConfigSupported(fallbackConfig);
          this.encoder.configure(fallbackSupport.config || fallbackConfig);
        } catch (fallbackError) {
          this.safeCloseEncoder();
          throw new Error(`[WebMEncoder] Failed to configure VideoEncoder even with fallback: ${fallbackError}`);
        }
      }
    };
    
    // We can't await in constructor, so we start it. 
    // It's fast enough before the first addFrame is called usually.
    // If not, we will need to wrap it.
    this.initPromise = initEncoder();

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

      this.isFinalized = true;
      this.finalizedBlob = new Blob([this.target.buffer], { type: this.config.mimeType });
      return this.finalizedBlob;
    } catch (error) {
      this.safeCloseEncoder();
      this.isFinalized = true;
      throw new Error(`[WebMEncoder] Failed to finalize WebM: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.isFinishing = false;
    }
  }

  public get encodeQueueSize(): number {
    return this.encoder.encodeQueueSize;
  }

  private ensureWritableState(): void {
    if (this.isFinalized) {
      throw new Error('[WebMEncoder] Encoder already finalized');
    }

    if (this.isFinishing) {
      throw new Error('[WebMEncoder] Encoder is finishing and can no longer accept frames');
    }

    this.ensureEncoderHealthy();
  }

  private ensureEncoderHealthy(): void {
    if (this.encoderError) {
      throw this.encoderError;
    }
  }

  private async waitForBackpressure(): Promise<void> {
    while (this.encoder.encodeQueueSize >= this.config.maxEncodeQueueSize) {
      await this.delay(this.config.backpressurePollMs);
      this.ensureEncoderHealthy();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  private normalizeTimestampMicros(timestampMicros: number): number {
    const rounded = Number.isFinite(timestampMicros) ? Math.round(timestampMicros) : 0;
    const nonNegative = Math.max(0, rounded);
    return nonNegative > this.lastTimestampMicros ? nonNegative : this.lastTimestampMicros + 1;
  }

  private normalizeDurationMicros(durationMicros?: number): number {
    if (!Number.isFinite(durationMicros)) {
      return 1;
    }

    return Math.max(1, Math.round(durationMicros ?? 1));
  }

  private safeCloseEncoder(): void {
    if (this.encoder.state !== 'closed') {
      try {
        this.encoder.close();
      } catch (error) {
        console.error('[WebMEncoder] Failed to close encoder:', error);
      }
    }
  }

  private toMuxerCodec(codec: string): string {
    const normalized = codec.toLowerCase();

    if (normalized === 'vp9' || normalized.startsWith('vp09')) {
      return 'V_VP9';
    }

    if (normalized === 'av1' || normalized.startsWith('av01')) {
      return 'V_AV1';
    }

    return 'V_VP8';
  }

  private createFrameSurface(
    width: number,
    height: number
  ): {
    canvas: OffscreenCanvas | HTMLCanvasElement;
    context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  } {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('[WebMEncoder] Failed to create 2D context for OffscreenCanvas');
      }

      return { canvas, context };
    }

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('[WebMEncoder] Failed to create 2D context for HTMLCanvasElement');
      }

      return { canvas, context };
    }

    throw new Error('[WebMEncoder] No canvas implementation available for frame preparation');
  }
}
