import { chromium } from '@playwright/test';

async function testWithAlertCheck() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    // Capture dialogs
    page.on('dialog', dialog => {
      console.log(`🚨 DIALOG: ${dialog.type()} - ${dialog.message()}`);
      dialog.dismiss();
    });

    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      if (text.includes('handleStartNesting') || text.includes('Worker') || text.includes('Progress')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    console.log('📍 Loading...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Click NESTING AX
    const btns = await page.locator('button').all();
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1500);

    // Click New Nest
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1500);

    console.log('\n✓ Modal should be open now');

    // Try clicking Nest without adding parts/sheets
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        console.log('🖱️ Clicking Nest button...');
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testWithAlertCheck();
