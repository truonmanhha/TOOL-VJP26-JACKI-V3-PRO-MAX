const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

code = code.replace(
    /onClick=\{\(\) => \{ setCurrentIndex\(0\);\n              setSpeedSliderVal\(100\);\n              setIsPlaying\(true\); setCurrentIndex\(0\); \}\}/,
    'onClick={() => { simState.current.index = 0; simState.current.progress = 0; setCurrentIndex(0); setIsPlaying(true); }}'
);

fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed!");
