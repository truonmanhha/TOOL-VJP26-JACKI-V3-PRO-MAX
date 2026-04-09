import { chromium } from '@playwright/test';

async function testWithScreenshot() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    page.on('console', msg => {
      if (msg.text().includes('clicked')) {
        console.log(msg.text());
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const btns = await page.locator('button').all();
    
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Take screenshot before clicking Nest
    await page.screenshot({ path: '/tmp/before-nest-click.png', fullPage: true });
    console.log('Screenshot 1 saved: /tmp/before-nest-click.png');

    // Click Nest
    const allBtns = await page.locator('button').all();
    for (let btn of allBtns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        console.log('Clicking Nest...');
        await btn.click({ force: true });
        break;
      }
    }

    await page.waitForTimeout(3000);

    // Take screenshot after clicking
    await page.screenshot({ path: '/tmp/after-nest-click.png', fullPage: true });
    console.log('Screenshot 2 saved: /tmp/after-nest-click.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testWithScreenshot();
