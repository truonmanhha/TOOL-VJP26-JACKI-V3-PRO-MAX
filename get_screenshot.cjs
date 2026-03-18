const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/');
  
  // Wait for React to mount
  await page.waitForTimeout(2000);
  
  // Try to find the DXF tab and click it
  const elements = await page.$$('button, a, div');
  for (const el of elements) {
    const text = await el.textContent();
    if (text && text.includes('DXF')) {
      await el.click();
      break;
    }
  }
  
  await page.waitForTimeout(1000);
  
  // Try to upload the file
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles('test_text_scale.dxf');
    await page.waitForTimeout(2000);
  } else {
    console.log("Could not find file input");
  }
  
  // Extract pixels from canvas directly to analyze them
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas:not(.pointer-events-none)'); // Try to get the actual drawing canvas
    if (!canvas) return "No canvas found";
    
    // We can't read pixels if it's tainted, but we can return data
    return {
      width: canvas.width,
      height: canvas.height,
      style: canvas.getAttribute('style'),
      className: canvas.className
    };
  });
  
  console.log("Canvas info:", canvasInfo);
  
  // We'll just take a screenshot and then use an image parser script to detect text
  await page.screenshot({ path: 'dxf_final.png' });
  console.log("Saved dxf_final.png");
  
  await browser.close();
})();
