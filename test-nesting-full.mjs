import { chromium } from '@playwright/test';

async function testFull() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const workerMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WorkerManager') || text.includes('executeNesting') || text.includes('Worker')) {
      console.log(`[${msg.type()}]`, text);
      workerMessages.push(text);
    }
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    console.log('✓ Page loaded');
    
    // Click NESTING AX
    await page.locator('button:has-text("NESTING AX")').click();
    await page.waitForTimeout(2000);

    // Click New Nest
    await page.locator('button:has-text("New Nest")').click();
    await page.waitForTimeout(2000);

    // Check if modal/dialog has appeared
    const modals = await page.locator('[role="dialog"]').all();
    console.log(`Found ${modals.length} modals/dialogs`);

    if (modals.length > 0) {
      console.log('\n📍 Inside modal, looking for Nest button');
      const nestButton = await page.locator('[role="dialog"] button:has-text("Nest")').first();
      const visible = await nestButton.isVisible().catch(() => false);
      console.log('Nest button visible:', visible);
      
      if (visible) {
        console.log('🖱️ Clicking Nest button...');
        await nestButton.click();
        await page.waitForTimeout(3000);
        
        console.log('\n✓ Nest button clicked!');
        console.log('📊 Worker Messages Captured:', workerMessages.length);
        workerMessages.forEach((msg, i) => {
          console.log(`  ${i+1}. ${msg}`);
        });
      } else {
        console.log('⚠️ Nest button not visible, taking screenshot');
        await page.screenshot({ path: '/tmp/modal-screenshot.png' });
        
        // Print all text in modal
        const text = await page.locator('[role="dialog"]').first().textContent();
        console.log('Modal content preview:', text?.substring(0, 500));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

await testFull();
