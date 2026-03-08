const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  // Change to GCode tab
  const gcodeTabBtn = await page.$('button[title="GCode Viewer"]');
  if (gcodeTabBtn) {
      await gcodeTabBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'gcode_gpu_menu.png' });
      console.log('Screenshot taken at gcode_gpu_menu.png');
  } else {
      console.log('Could not find GCode Viewer tab');
  }

  await browser.close();
})();
