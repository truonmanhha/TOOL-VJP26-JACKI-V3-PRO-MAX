const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log("Starting browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("Navigating to localhost:5173...");
  try {
    await page.goto('http://localhost:5173/');
    
    // Wait for app to load
    await page.waitForTimeout(2000);
    
    // Click on DXF Tool tab (if it exists, assuming text contains DXF)
    const tabs = await page.$$('button, a, div[role="tab"]');
    for (const tab of tabs) {
      const text = await tab.evaluate(el => el.textContent);
      if (text && text.toLowerCase().includes('dxf')) {
        await tab.click();
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    
    // Upload file
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles('test_text_scale.dxf');
      await page.waitForTimeout(3000); // Wait for processing and rendering
    }
    
    // Take screenshot
    await page.screenshot({ path: 'dxf_result.png', fullPage: true });
    console.log("Screenshot saved to dxf_result.png");
    
    // Check canvas state
    const canvasData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        className: canvas.className
      };
    });
    console.log("Canvas data:", canvasData);
    
  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await browser.close();
  }
})();
