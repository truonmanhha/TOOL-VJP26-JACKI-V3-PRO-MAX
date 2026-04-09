import { chromium } from '@playwright/test';

async function testShowDebug() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    // Show all logs
    page.on('console', msg => {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    console.log('📍 Loading...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    console.log('\n📍 Navigating to NESTING AX...');
    const btns = await page.locator('button').all();
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1500);

    console.log('📍 Creating new nest...');
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(2000);

    console.log('\n📍 Clicking Nest button (should trigger debug logs)...\n');
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        await btn.click();
        await page.waitForTimeout(3000);
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testShowDebug();
