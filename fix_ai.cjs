const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');
code = code.replace(
    /const handleSendReport = async \(\) => {[\s\S]*?videoBlob = await recordPromise;\n          }\n      } catch \(e\) {/,
    `const handleSendReport = async () => {
      if(!analysis || isReporting) return;
      setIsReporting(true);
      
      let videoBlob: Blob | null = null;
      try {
          if (miniCanvasRef.current) {
              const canvas = miniCanvasRef.current;
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
              setSpeedSliderVal(100);
              
              // Wait a bit for state to flush and camera to settle
              await new Promise(r => setTimeout(r, 500));
              
              recorder.start();
              setIsPlaying(true);
              
              // Record until it reaches the end or max 8 seconds
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
      } catch (e) {`
);
fs.writeFileSync('components/GCodeViewer.tsx', code);
