const fs = require('fs');
const content = fs.readFileSync('./components/GCodeViewer.tsx', 'utf8');

// Looking for `parseManualGCode` to see what is missing.
const match = content.match(/const parseManualGCode = async \(\) => \{[\s\S]*?parseManualGCode\(\);/);
if (match) {
    console.log(match[0]);
}

