const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://web.vina-cad.com/vi');
  
  // Wait a bit for page to load
  await page.waitForTimeout(5000);
  
  // Dump scripts to see if they use PIXI, Fabric, Three, or D3
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
  });
  
  console.log('Scripts:', scripts);
  
  await browser.close();
})();
