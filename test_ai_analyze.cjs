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
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
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
  
  console.log('Uploading test.nc using standard File Chooser...');
  
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.evaluate(() => {
      // Find the file input explicitly and click it
      const input = document.querySelector('input[type=file]');
      if(input) input.click();
    })
  ]);
  
  await fileChooser.accept([path.resolve(__dirname, 'test.nc')]);
  console.log('File uploaded.');
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Clicking AI Analyze button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    // Use the actual text or title to find the button
    const aiButton = buttons.find(b => b.textContent.includes('AI') && b.textContent.includes('Analyze'));
    if (aiButton) {
        console.log('Clicking AI button: ' + aiButton.textContent);
        aiButton.click();
    } else {
        console.log('AI button not found, searching by title...');
        const btnByTitle = buttons.find(b => b.getAttribute('title') && b.getAttribute('title').includes('AI Analyze'));
        if (btnByTitle) {
            btnByTitle.click();
        } else {
             console.log('Still not found. Clicking any button that has AI');
             const anyAIBtn = buttons.find(b => b.textContent.includes('AI'));
             if(anyAIBtn) anyAIBtn.click();
        }
    }
  });
  
  console.log('Waiting to observe errors...');
  await new Promise(r => setTimeout(r, 10000));
  
  await page.screenshot({ path: 'ai_error.png' });
  console.log('Screenshot saved to ai_error.png');
  
  await browser.close();
  console.log('Done.');
})();
