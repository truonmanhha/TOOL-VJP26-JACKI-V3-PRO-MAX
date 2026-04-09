const fs = require('fs');
let css = fs.readFileSync('components/NestingAX/AutocadReal.css', 'utf8');
css = css.replace(/\\n/g, '\n').replace(/\\"/g, '"');
fs.writeFileSync('components/NestingAX/AutocadReal.css', css);
