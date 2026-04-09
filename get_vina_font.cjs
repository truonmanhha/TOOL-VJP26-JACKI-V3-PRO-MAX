const fs = require('fs');
const https = require('https');

https.get('https://web.vina-cad.com/libs/DrawingModule.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('vina_drawing.js', data);
    console.log('Downloaded VinaCAD drawing module');
    
    // Find text/font related methods
    const matches = data.match(/.{0,50}fillText.{0,50}/g) || [];
    console.log('fillText usages:', matches.slice(0, 5));
    
    const scaleMatches = data.match(/.{0,50}ctx\.font.{0,50}/g) || [];
    console.log('ctx.font usages:', scaleMatches.slice(0, 5));
  });
});
