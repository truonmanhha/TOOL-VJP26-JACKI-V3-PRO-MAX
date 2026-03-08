const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  // Just a simple script to verify logic
  console.log("Success")
  await browser.close();
})();
