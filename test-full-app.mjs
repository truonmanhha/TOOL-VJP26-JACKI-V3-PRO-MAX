import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  let logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') console.log(`BROWSER ERROR: ${text}`);
  });
  
  page.on('pageerror', err => {
    logs.push(`[PAGE ERROR] ${err.message}`);
    console.log(`REACT CRASH: ${err.message}`);
  });

  try {
    console.log("Navigating to app...");
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Check ChatBot
    console.log("Testing ChatBot...");
    await page.evaluate(() => {
        const botTrigger = Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-bot') || b.textContent.includes('AI') || b.className.includes('fixed bottom-6 right-6'));
        if (botTrigger) botTrigger.click();
    });
    await page.waitForTimeout(1000);
    
    // Switch to GCode tab
    console.log("Switching to GCode tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const gcodeTab = tabs.find(b => b.textContent.includes('G-CODE'));
      if (gcodeTab) gcodeTab.click();
    });
    await page.waitForTimeout(2000);
    
    // Take screenshot of GCode tab
    await page.screenshot({ path: 'gcode-tab-init.png' });
    console.log("Took screenshot of GCode tab");

    // Click 'SỬA'
    console.log("Clicking 'SỬA'...");
    await page.evaluate(() => {
       const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'SỬA');
       if (editBtn) editBtn.click();
    });
    await page.waitForTimeout(1000);
    
    // Type code
    console.log("Typing GCode...");
    await page.evaluate(() => {
       const textarea = document.querySelector('textarea');
       if (textarea) {
           textarea.value = `G21\nG90\nG0 X0 Y0\nG1 X100 Y100\nM30`;
           textarea.dispatchEvent(new Event('input', { bubbles: true }));
           textarea.dispatchEvent(new Event('change', { bubbles: true }));
       }
    });
    await page.waitForTimeout(1000);
    
    // Click 'LƯU'
    console.log("Clicking 'LƯU'...");
    await page.evaluate(() => {
       const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('LƯU'));
       if (saveBtn) saveBtn.click();
    });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'gcode-tab-after-save.png' });
    
  } catch (e) {
    console.error("Test execution failed:", e.message);
    logs.push(`[TEST EXCEPTION] ${e.message}`);
  }
  
  fs.writeFileSync('test-logs.txt', logs.join('\n'));
  await browser.close();
  console.log("Test finished.");
})();
