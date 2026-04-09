const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://web.vina-cad.com/vi');
  
  // Wait a bit for page to load
  await page.waitForTimeout(3000);
  
  // Find all canvases and SVGs
  const canvases = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('canvas')).map(c => ({
      id: c.id,
      className: c.className,
      width: c.width,
      height: c.height
    }));
  });
  
  const svgs = await page.evaluate(() => {
    return document.querySelectorAll('svg').length;
  });
  
  console.log('Canvases:', canvases);
  console.log('SVGs count:', svgs);
  
  await browser.close();
})();
