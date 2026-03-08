const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // run headless to just take screenshot
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Wait for boot animation to complete
  await new Promise(r => setTimeout(r, 6000));
  
  console.log('Switching to G-Code Viewer tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const gcodeTab = tabs.find(t => t.textContent.includes('G-Code') || t.textContent.includes('GCode'));
    if (gcodeTab) gcodeTab.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Clicking Tool Config or Theme button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const themeBtn = buttons.find(b => b.textContent.includes('Theme') || b.textContent.includes('Config'));
    if (themeBtn) themeBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'popup_test.png' });
  console.log('Screenshot saved to popup_test.png');
  
  await browser.close();
  console.log('Done.');
})();
