import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()
    
# Clean up duplicate catch block from earlier bad python replace
fixed_try = """    try {
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

# Find the entire try block inside constructor
start_idx = content.find("    try {\n      try {")
end_idx = content.find("    } catch (error) {\n      this.safeCloseEncoder();") + len("    } catch (error) {\n      this.safeCloseEncoder();\n      throw new Error(`[WebMEncoder] Failed to configure VideoEncoder: ${error instanceof Error ? error.message : 'unknown error'}`);\n    }")

if start_idx != -1:
    content = content[:start_idx] + fixed_try + content[end_idx:]
    with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
        f.write(content)
