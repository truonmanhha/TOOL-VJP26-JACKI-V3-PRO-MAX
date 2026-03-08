const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const search = `const originalSpeed = speedSliderVal;
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
                  setSpeedSliderVal(originalSpeed);`;

const replace = `setCurrentIndex(0);
                  simState.current.index = 0;
                  simState.current.progress = 0;
                  
                  await new Promise(r => setTimeout(r, 500));
                  
                  recorder.start();
                  setIsPlaying(true);
                  
                  // Same 3 min cap
                  let timeElapsed = 0;
                  while(simState.current.index < commands.length - 2 && timeElapsed < 180000) {
                      await new Promise(r => setTimeout(r, 500));
                      timeElapsed += 500;
                  }
                  
                  recorder.stop();
                  setIsPlaying(false);`;

code = code.replace(search, replace);
fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed MediaRecorder fallback block");
