const fs = require('fs');

// We need to render it MUCH smoother.
// The current logic jumps the `currentIndex`, waits 16ms for React to render, then captures.
// BUT because R3F renders on `requestAnimationFrame` AND the `currentIndex` causes the `ToolPath` and `ToolHead` to jump immediately without smooth progress interpolation.

// The BEST way to capture a smooth video in R3F offline is to bypass React state (which is slow and batched) and directly mutate the refs, then force a render.
// However, since we can't easily access the internal R3F `gl.render` from outside, the next best thing is to use the existing `simState` logic that runs inside `useFrame`.
// The problem with `VideoEncoder` the way it is written is it just sets `currentIndex`, waits 16ms, captures.

// Let's rewrite the video recording fallback/encoder to run a real-time (but sped up) capture.
// Wait, the user said "ý là thay vì quay video thì nó sẽ tạo hẳn 1 video rồi gửi thẳng sang discord luôn , tốc độ video theo đúng tốc độ đã cài đặt , thay vì phải quay video realtime thì nó sẽ render luôn video rồi gửi sang discord mà không cần chờ đợi nó quay xong"
// Oh, the user explicitly asked to NOT do it realtime, but render it as fast as possible.
// So we must interpolate.

// The jumping is because:
// 1. `simState.current.index` and `simState.current.progress` are what controls the toolhead natively in `useFrame`.
// 2. The VideoEncoder loop sets `setCurrentIndex(cmdIndex)`, which changes the line, but doesn't set `interpolatedPosRef` or `simState`. So the toolhead might just jump abruptly or not render correctly!

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Inside `handleSendReport` -> `if (encoder) {`

const oldVideoEncoderLoop = `                  for (let i = 0; i < numFrames; i++) {
                      // Map frame to command index
                      // Since GCode moves at different speeds, linearly interpolating index isn't 100% accurate, 
                      // but for offline rendering this creates a smooth 0-100% path timeline without skipping edges.
                      const cmdIndex = Math.min(commands.length - 1, Math.floor((i / numFrames) * commands.length));
                      
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
                  }`;

const newVideoEncoderLoop = `                  const renderFps = 60;
                  const durationS = estimatedPlayTimeSeconds;
                  const totalFrames = Math.floor(durationS * renderFps);
                  const totalDistance = commands.reduce((acc, cmd, i) => {
                      if (i === 0 || cmd.type === 'OTHER') return acc;
                      const prev = commands[i-1];
                      return acc + Math.sqrt(Math.pow(cmd.x - prev.x, 2) + Math.pow(cmd.y - prev.y, 2) + Math.pow(cmd.z - prev.z, 2));
                  }, 0);

                  let currentDist = 0;
                  let cmdIdx = 0;

                  for (let i = 0; i < totalFrames; i++) {
                      // Interpolate based on distance to make speed uniform
                      const targetDist = (i / totalFrames) * totalDistance;
                      
                      while (cmdIdx < commands.length - 1) {
                          const c1 = commands[cmdIdx];
                          const c2 = commands[cmdIdx + 1];
                          const d = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2) + Math.pow(c2.z - c1.z, 2));
                          if (currentDist + d >= targetDist || d === 0) {
                              const progress = d === 0 ? 1 : (targetDist - currentDist) / d;
                              
                              // Force update tool head
                              interpolatedPosRef.current.set(
                                  c1.x + (c2.x - c1.x) * progress,
                                  c1.y + (c2.y - c1.y) * progress,
                                  c1.z + (c2.z - c1.z) * progress
                              );
                              
                              // We only update React state occasionally to avoid slowing down rendering
                              if (i % 5 === 0) {
                                  setCurrentIndex(cmdIdx);
                              }
                              break;
                          }
                          currentDist += d;
                          cmdIdx++;
                      }
                      
                      // Wait for R3F to paint the updated ref
                      await new Promise(r => setTimeout(r, 10)); // ~100fps paint speed to ensure next frame is caught
                      
                      const timestampUs = Math.round((i * 1000000) / renderFps);
                      try {
                          const frame = new (window as any).VideoFrame(canvas, { timestamp: timestampUs });
                          encoder.encode(frame, { keyFrame: i % 60 === 0 });
                          frame.close();
                      } catch (e) {
                          console.error("Frame encode error", e);
                      }
                  }`;

content = content.replace(oldVideoEncoderLoop, newVideoEncoderLoop);

// Also need to make sure frameRate matches in muxer and config!
// Old: frameRate: 30, config.framerate: 30.
// Let's up it to 60 for absolute smoothness.
content = content.replace(/frameRate: 30/g, 'frameRate: 60');
content = content.replace(/framerate: 30/g, 'framerate: 60');
content = content.replace(/const numFrames = Math.floor\(estimatedPlayTimeSeconds \* 30\);/g, '');

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Fixed video smoothness');
