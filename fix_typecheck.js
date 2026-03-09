const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.scripts.typecheck) {
  packageJson.scripts.typecheck = "tsc --noEmit";
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log("Added typecheck script to package.json");
} else {
  console.log("typecheck script already exists");
}
