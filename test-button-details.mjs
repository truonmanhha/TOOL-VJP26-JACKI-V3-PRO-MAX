import { chromium } from '@playwright/test';

async function testButtonDetails() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    page.on('console', msg => {
      if (msg.text().includes('🔴') || msg.text().includes('onStartNesting')) {
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

    // Find exact Nest button and get its details
    const allBtns = await page.locator('button').all();
    for (let btn of allBtns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        console.log('Button found, details:');
        console.log('  Text:', text.trim());
        console.log('  Classes:', await btn.getAttribute('class'));
        
        // Try clicking with different methods
        console.log('\n🔧 Trying click...');
        await btn.click();
        
        await page.waitForTimeout(2000);
        
        // Check if modal is still visible
        const modal = await page.locator('[class*="modal"]').first();
        const isVisible = await modal.isVisible().catch(() => false);
        console.log('Modal still visible:', isVisible);
        
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testButtonDetails();
