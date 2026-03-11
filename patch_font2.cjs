const fs = require('fs');
let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The first patch missed line 3836 and 3897 because of spacing or exact match failure.
// Let's replace all occurrences using regex.

code = code.replace(/fontFamily="Noto Sans, sans-serif"/g, 'fontFamily="Arial, Helvetica, Tahoma, sans-serif"');

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched all Noto Sans occurrences");
