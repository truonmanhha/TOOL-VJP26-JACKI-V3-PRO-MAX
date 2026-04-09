import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Fallback might fail if VideoEncoder natively doesn't support the configuration sync validation yet.
# To ensure zero errors, we must do WebCodecs VideoEncoder.isConfigSupported.

new_configure = """
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
"""

# Let's wrap addFrame to wait for initialization
add_frame_old = """  public async addFrame(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    timestampMicros: number,
    durationMicros?: number
  ): Promise<void> {"""

add_frame_new = """  public async addFrame(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    timestampMicros: number,
    durationMicros?: number
  ): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }"""


# Replace the constructor try-catch with the async initializer
old_constructor_try = """    try {
      this.encoder.configure({
        codec: this.config.codec,
        width: this.config.width,
        height: this.config.height,
        bitrate: this.config.bitrate,
        framerate: this.config.frameRate,
        hardwareAcceleration: this.config.hardwareAcceleration
      });
    } catch (error) {
      console.warn('[WebMEncoder] Hardware/VP9 encode failed, falling back to VP8/CPU:', error);
      // Fallback
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
      try {
        this.encoder.configure({
          codec: 'vp8',
          width: this.config.width,
          height: this.config.height,
          bitrate: this.config.bitrate,
          framerate: this.config.frameRate,
          hardwareAcceleration: 'prefer-software'
        });
      } catch (fallbackError) {
        this.safeCloseEncoder();
        throw new Error(`[WebMEncoder] Failed to configure VideoEncoder even with fallback: ${fallbackError.message}`);
      }
    }"""

content = content.replace(old_constructor_try, new_configure)
content = content.replace(add_frame_old, add_frame_new)
content = content.replace("private finalizedBlob: Blob | null = null;", "private finalizedBlob: Blob | null = null;\n  private initPromise: Promise<void> | null = null;")


with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)

