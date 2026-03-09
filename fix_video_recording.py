import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First, look for any unhandled promise rejections inside the encoder workflow
# The user issue: "sửa cái tạo video nè" (fix the video creation)
# Often, VideoEncoder API in Chrome requires very specific configuration, 
# or WebMWriter fails if the WebCodecs API is used incorrectly.

# Let's add better logging and try-catch around the encoder block
old_encoder_block = """const encSupport = await (window as any).VideoEncoder.isConfigSupported(encConfig);
  if (encSupport.supported) {
    const encoder = new (window as any).VideoEncoder({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: any) => console.error('[VideoShare] encode error', e)
    });
    encoder.configure(encConfig);"""

new_encoder_block = """try {
  const encSupport = await (window as any).VideoEncoder.isConfigSupported(encConfig);
  if (encSupport.supported) {
    const encoder = new (window as any).VideoEncoder({
        output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
        error: (e: any) => console.error('[VideoShare] encode error', e)
    });
    encoder.configure(encConfig);"""

if old_encoder_block in content:
    print("Found encoder block")

# Instead of rewriting python let's make a plan since I'm not entirely sure what specifically fails in video recording.
# Is it the WebCodecs API missing in Firefox/Safari? 
# Is the `muxer` variable (WebMWriter) crashing?

