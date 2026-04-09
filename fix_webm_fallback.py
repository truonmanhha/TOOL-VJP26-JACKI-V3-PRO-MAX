import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# WebCodecs `prefer-hardware` may fail on some GPUs/OS combos (e.g. lack of VP9 hardware encoder).
# We must gracefully fallback.

old_try = """    try {
      this.encoder.configure({
        codec: this.config.codec,
        width: this.config.width,
        height: this.config.height,
        bitrate: this.config.bitrate,
        framerate: this.config.frameRate,
        hardwareAcceleration: this.config.hardwareAcceleration
      });
    } catch (error) {"""

new_try = """    try {
      try {
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
        // If GPU hardware encode fails (e.g. no VP9 hardware encoder), gracefully fallback to CPU
        console.warn('[WebMEncoder] Hardware encode failed, falling back to CPU:', err);
        this.encoder.configure({
          codec: this.config.codec,
          width: this.config.width,
          height: this.config.height,
          bitrate: this.config.bitrate,
          framerate: this.config.frameRate,
          hardwareAcceleration: 'prefer-software'
        });
      }
    } catch (error) {"""

content = content.replace(old_try, new_try)

# Also let's use a widely supported codec if VP9 specifically is having issues
# Sometimes vp09 fails entirely if the profile string is strict, let's just make sure the fallback catches it.

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
