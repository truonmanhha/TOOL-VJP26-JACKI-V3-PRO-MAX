import { chromium } from '@playwright/test';

async function testWithBetterSelector() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('clicked') || text.includes('Calling') || text.includes('UNDEFINED')) {
        console.log(`[${msg.type()}] ${text}`);
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

    // Find the button with EXACT text "Nest" (not containing)
    const allBtns = await page.locator('button').all();
    let nestBtn = null;
    for (let btn of allBtns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        nestBtn = btn;
        break;
      }
    }

    if (nestBtn) {
      console.log('✅ Found exact Nest button');
      console.log('🖱️ Clicking...');
      await nestBtn.click({ force: true });
      
      console.log('⏳ Waiting 10 seconds for logs...');
      await page.waitForTimeout(10000);
      
      console.log('✓ Done');
    } else {
      console.log('❌ Could not find exact Nest button');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testWithBetterSelector();
