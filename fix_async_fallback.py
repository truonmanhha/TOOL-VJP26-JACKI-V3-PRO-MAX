import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# VP09 config might just not be supported at all by VideoEncoder sync check in chromium
# If it fails, WebCodecs throws 'Encoder creation error'.
# The safest fallback is setting codec back to vp8 in DEFAULT

old_config = """export const DEFAULT_WEBM_ENCODER_CONFIG: WebMEncoderConfig = {
  width: 1280,
  height: 720,
  frameRate: 60,
  bitrate: 2_500_000,
  codec: 'vp09.00.10.08',
  hardwareAcceleration: 'prefer-hardware', // Force GPU encode
  keyFrameInterval: 60,
  maxEncodeQueueSize: 8,
  backpressurePollMs: 4,
  mimeType: 'video/webm'
};"""

new_config = """export const DEFAULT_WEBM_ENCODER_CONFIG: WebMEncoderConfig = {
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

content = content.replace(old_config, new_config)

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
