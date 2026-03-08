const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Track React errors specifically
  page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || msg.type() === 'error') {
          console.log('❌ PAGE ERROR:', text);
      } else {
          console.log('PAGE LOG:', text);
      }
  });
  
  page.on('pageerror', error => console.log('❌ UNCAUGHT PAGE ERROR:', error.message));
  
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
  
  console.log('Clicking Import File button directly...');
  
  const fileContent = fs.readFileSync(path.resolve(__dirname, 'test.nc'), 'utf8');
  await page.evaluate((content) => {
    // Look for the edit mode
    const buttons = Array.from(document.querySelectorAll('button'));
    const editBtn = buttons.find(b => b.textContent.includes('EDIT') || b.textContent.includes('SỬA'));
    if (editBtn) {
        editBtn.click();
        setTimeout(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                nativeInputValueSetter.call(textarea, content);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('LƯU') || b.textContent.includes('SAVE'));
                if (saveBtn) saveBtn.click();
                console.log('Content injected and saved');
            }
        }, 500);
    }
  }, fileContent);
  
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Clicking AI Analyze button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const aiButton = buttons.find(b => b.textContent.includes('AI') || b.textContent.includes('Phân tích'));
    if (aiButton) {
        aiButton.click();
    }
  });
  
  console.log('Waiting to observe errors...');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Simulating AI analyze completion by setting mock state if possible or waiting more');
  
  await new Promise(r => setTimeout(r, 10000));
  
  await page.screenshot({ path: 'ai_error.png' });
  console.log('Screenshot saved to ai_error.png');
  
  await browser.close();
  console.log('Done.');
})();
