import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Let's ensure codec profile is perfectly standard so that GPU encode actually kicks in
# vp09.00.10.08 is strictly Profile 0, Level 1, 8-bit. We can just use "vp8" for hardware encoding if vp9 hardware isn't catching it.
# Actually, the best trick to speed up GPU rendering is to increase maxEncodeQueueSize so WebCodecs can parallelize
# encoding of frames on the GPU.

old_config = """export const DEFAULT_WEBM_ENCODER_CONFIG: WebMEncoderConfig = {
  width: 1280,
  height: 720,
  frameRate: 60,
  bitrate: 2_500_000,
  codec: 'vp8', // Fallback to safe VP8 which is supported almost universally (hw or sw)
  hardwareAcceleration: 'prefer-hardware', // Attempt GPU encode, fallback automatically by browser for vp8
  keyFrameInterval: 60,
  maxEncodeQueueSize: 8,
  backpressurePollMs: 4,
  mimeType: 'video/webm'
};"""

new_config = """export const DEFAULT_WEBM_ENCODER_CONFIG: WebMEncoderConfig = {
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
};"""

content = content.replace(old_config, new_config)

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
