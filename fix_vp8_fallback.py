import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Let's adjust the codec fallback in case vp9 is throwing Encoder creation error completely
# WebCodecs `isConfigSupported` is the proper way, but try-catch should work. If not, VP8 is safer.

old_try = """      try {
        // First try to configure with requested hardware acceleration (prefer-hardware)
        this.encoder.configure({
          codec: this.config.codec,
          width: this.config.width,
          height: this.config.height,
          bitrate: this.config.bitrate,
          framerate: this.config.frameRate,
          hardwareAcceleration: this.config.hardwareAcceleration
        });
      } catch (err) {"""

new_try = """      try {
        // First try to configure with requested hardware acceleration (prefer-hardware)
        this.encoder.configure({
          codec: this.config.codec,
          width: this.config.width,
          height: this.config.height,
          bitrate: this.config.bitrate,
          framerate: this.config.frameRate,
          hardwareAcceleration: this.config.hardwareAcceleration
        });
      } catch (err) {
        // If GPU hardware encode fails (e.g. no VP9 hardware encoder), gracefully fallback to VP8 CPU
        console.warn('[WebMEncoder] Hardware encode failed, falling back to VP8/CPU:', err);
        this.config.codec = 'vp8';
        this.muxer = new Muxer({
          target: this.target,
          video: {
            codec: 'V_VP8', // Ensure muxer matches the fallback codec
            width: this.config.width,
            height: this.config.height,
            frameRate: this.config.frameRate
          },
          firstTimestampBehavior: 'offset'
        });
"""

content = content.replace(old_try, new_try)

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
