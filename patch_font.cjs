const fs = require('fs');

let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The Noto Sans font might not be loaded or might not support Vietnamese characters well.
// Let's use standard system fonts that support Vietnamese: Arial, Tahoma, Helvetica, sans-serif

code = code.replace(
    'fontFamily="Noto Sans, sans-serif"', 
    'fontFamily="Arial, Helvetica, Tahoma, sans-serif"'
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched font");

