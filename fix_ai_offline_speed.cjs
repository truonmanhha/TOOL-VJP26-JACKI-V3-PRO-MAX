const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Replace the numFrames logic so it scales properly based on the user's selected speed

const oldCode = `const totalDistance = commands.length > 0 ? analysis.totalCutDistance + analysis.totalRapidDistance : 0;
              // Just a rough estimate for demo - let's render 120 frames minimum or max 300 frames to keep file size small
              const numFrames = Math.min(300, Math.max(60, Math.floor(commands.length / 5))); `;

const newCode = `// Determine duration in real seconds based on the simulation playback logic
              // playbackSpeed represents the multiplier against standard feed rate.
              // To accurately capture the intended speed setting, we calculate the estimated time it would take to play.
              let estimatedPlayTimeSeconds = 0;
              for (let i = 0; i < commands.length - 1; i++) {
                  const c1 = commands[i], c2 = commands[i + 1];
                  const segLen = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2) + Math.pow(c2.z - c1.z, 2));
                  const feed = c1.f || 1000;
                  const speed = (feed / 60) * playbackSpeed;
                  if (speed > 0) estimatedPlayTimeSeconds += segLen / speed;
              }
              
              if (estimatedPlayTimeSeconds < 1) estimatedPlayTimeSeconds = 1;
              if (estimatedPlayTimeSeconds > 30) estimatedPlayTimeSeconds = 30; // Cap video at 30 seconds to prevent massive file sizes and OOM
              
              // 30 FPS video
              const numFrames = Math.floor(estimatedPlayTimeSeconds * 30);`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed speed translation for offline rendering");
