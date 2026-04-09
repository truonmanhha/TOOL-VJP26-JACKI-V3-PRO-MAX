const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('Build passed!');
} catch (e) {
  console.log('Build failed!');
  process.exit(1);
}
