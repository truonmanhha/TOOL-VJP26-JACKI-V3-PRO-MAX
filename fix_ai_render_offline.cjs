const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Add import for WebM Muxer
if (!code.includes("import { Muxer, ArrayBufferTarget }")) {
    code = code.replace(
        "import * as THREE from 'three';",
        "import * as THREE from 'three';\nimport { Muxer, ArrayBufferTarget } from 'webm-muxer';"
    );
}

// Replace the handleSendReport implementation
const oldFunction = /const handleSendReport = async \(\) => \{[\s\S]*?try \{\n          const formData = new FormData\(\);/;

const newFunction = `const handleSendReport = async () => {
      if(!analysis || isReporting) return;
      setIsReporting(true);
      
      let videoBlob: Blob | null = null;
      try {
          if (miniCanvasRef.current) {
              const canvas = miniCanvasRef.current;
              
              // We will render it offline at 30 FPS.
              // Calculate how many frames needed based on original speed setting and simulation time.
              const totalDistance = commands.length > 0 ? analysis.totalCutDistance + analysis.totalRapidDistance : 0;
              // Just a rough estimate for demo - let's render 120 frames minimum or max 300 frames to keep file size small
              const numFrames = Math.min(300, Math.max(60, Math.floor(commands.length / 5))); 
              
              const width = canvas.width;
              const height = canvas.height;
              
              // Create Muxer
              let muxer = new Muxer({
                  target: new ArrayBufferTarget(),
                  video: {
                      codec: 'V_VP8',
                      width: width,
                      height: height,
                      frameRate: 30
                  }
              });
              
              let encoder: any = null;
              if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
                  const config = {
                      codec: 'vp8',
                      width: width,
                      height: height,
                      bitrate: 2_500_000,
                      framerate: 30
                  };
                  
                  const support = await (window as any).VideoEncoder.isConfigSupported(config);
                  if (support.supported) {
                      encoder = new (window as any).VideoEncoder({
                          output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
                          error: (e: any) => console.error(e)
                      });
                      encoder.configure(config);
                  }
              }
              
              if (encoder) {
                  // Mute the playback so the user doesn't see it jumping around
                  const originalIndex = currentIndex;
                  const originalIsPlaying = isPlaying;
                  setIsPlaying(false);
                  
                  for (let i = 0; i < numFrames; i++) {
                      // Map frame to command index
                      const cmdIndex = Math.floor((i / numFrames) * commands.length);
                      
                      // Advance state synchronously (React might need time to re-render, so we mock advance the UI,
                      // or better yet, we just capture what is on canvas by manually requesting it if possible).
                      // Since we can't easily force R3F to render synchronously in a loop without requestAnimationFrame,
                      // we'll step through using a fast timeout to allow R3F to paint.
                      
                      setCurrentIndex(cmdIndex);
                      
                      // Wait just a tiny bit for the canvas to update (1 frame at 60fps)
                      await new Promise(r => setTimeout(r, 16));
                      
                      const timestampUs = Math.round((i * 1000000) / 30);
                      const frame = new (window as any).VideoFrame(canvas, { timestamp: timestampUs });
                      encoder.encode(frame, { keyFrame: i % 30 === 0 });
                      frame.close();
                  }
                  
                  await encoder.flush();
                  encoder.close();
                  muxer.finalize();
                  
                  videoBlob = new Blob([muxer.target.buffer], { type: 'video/webm' });
                  
                  // Restore state
                  setCurrentIndex(originalIndex);
                  if (originalIsPlaying) setIsPlaying(true);
              } else {
                  // Fallback to MediaRecorder if VideoEncoder is not supported
                  const stream = canvas.captureStream(30);
                  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                  const chunks: Blob[] = [];
                  recorder.ondataavailable = (e) => chunks.push(e.data);
                  const recordPromise = new Promise<Blob>((resolve) => {
                      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
                  });
                  
                  const originalSpeed = speedSliderVal;
                  setCurrentIndex(0);
                  simState.current.index = 0;
                  simState.current.progress = 0;
                  setSpeedSliderVal(100); // Need to speed up for fallback to not hang too long
                  await new Promise(r => setTimeout(r, 500));
                  
                  recorder.start();
                  setIsPlaying(true);
                  
                  let timeElapsed = 0;
                  while(simState.current.index < commands.length - 2 && timeElapsed < 8000) {
                      await new Promise(r => setTimeout(r, 200));
                      timeElapsed += 200;
                  }
                  
                  recorder.stop();
                  setIsPlaying(false);
                  setSpeedSliderVal(originalSpeed);
                  videoBlob = await recordPromise;
              }
          }
      } catch (e) {
          console.error("Video recording failed", e);
      }
      
      try {
          const formData = new FormData();`;

code = code.replace(oldFunction, newFunction);
fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Replaced with WebCodecs offline rendering implementation.");
