const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const search = `              const originalSpeed = speedSliderVal;
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
              setSpeedSliderVal(originalSpeed);`;

const replace = `              setCurrentIndex(0);
              simState.current.index = 0;
              simState.current.progress = 0;
              
              // Chờ UI reset về điểm xuất phát
              await new Promise(r => setTimeout(r, 500));
              
              recorder.start();
              setIsPlaying(true);
              
              // Ghi hình cho đến khi chạy đến dòng lệnh cuối cùng (giữ đúng tốc độ hiện tại của người dùng)
              // Capping thời gian ghi hình tối đa là 3 phút (180000ms) để đề phòng video quá nặng không gửi được lên Discord
              let timeElapsed = 0;
              while(simState.current.index < commands.length - 2 && timeElapsed < 180000) {
                  await new Promise(r => setTimeout(r, 500));
                  timeElapsed += 500;
              }
              
              recorder.stop();
              setIsPlaying(false);`;

if (!code.includes("const originalSpeed = speedSliderVal;")) {
    console.error("Could not find the target code block to replace.");
} else {
    code = code.replace(search, replace);
    fs.writeFileSync('components/GCodeViewer.tsx', code);
    console.log("Successfully replaced the recording logic.");
}
