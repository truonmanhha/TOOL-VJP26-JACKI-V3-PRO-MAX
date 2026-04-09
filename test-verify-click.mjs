import { chromium } from '@playwright/test';

async function testVerifyClick() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('clicked') || text.includes('onStart') || text.includes('DEBUG')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const btns = await page.locator('button').all();
    
    // Click NESTING AX
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    // Click New Nest
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        console.log('✓ Found and clicking New Nest button');
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Find Nest button  
    let nestBtn = null;
    const allBtns = await page.locator('button').all();
    for (let btn of allBtns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        nestBtn = btn;
        break;
      }
    }

    if (nestBtn) {
      console.log('✓ Found Nest button');
      const isEnabled = await nestBtn.isEnabled();
      const isVisible = await nestBtn.isVisible();
      console.log(`  - Visible: ${isVisible}, Enabled: ${isEnabled}`);
      
      if (isVisible && isEnabled) {
        console.log('🖱️ Clicking Nest button...');
        await nestBtn.click({ force: true });
        console.log('✓ Click command sent');
        await page.waitForTimeout(5000);
      } else {
        console.log('⚠️ Button not visible or not enabled');
      }
    } else {
      console.log('❌ Nest button not found');
      // Show all button texts
      const allBtnTexts = [];
      for (let btn of allBtns) {
        const text = await btn.textContent();
        allBtnTexts.push(text.trim());
      }
      console.log('Available buttons:', [...new Set(allBtnTexts)].slice(0, 20));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testVerifyClick();
