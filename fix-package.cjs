const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/package.json';
let pkg = JSON.parse(fs.readFileSync(file, 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  "dev:web": "vite",
  "dev:python": "cd backend && uvicorn nesting_api:app --reload --port 8000",
  "dev": "concurrently -c \"cyan,magenta\" -n \"REACT,PYTHON\" \"npm run dev:web\" \"npm run dev:python\""
};

fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
console.log('Updated package.json scripts');
