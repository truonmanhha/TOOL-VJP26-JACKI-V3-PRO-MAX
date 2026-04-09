import { chromium } from '@playwright/test';

async function testFullNesting() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const workerMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Worker') || text.includes('Progress') || text.includes('nesting') || text.includes('completed')) {
      workerMessages.push(text);
      console.log(`[${msg.type()}]`, text);
    }
  });

  try {
    console.log('🌐 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    console.log('\n📍 STEP 1: Click NESTING AX');
    await page.locator('button:has-text("NESTING AX")').click();
    await page.waitForTimeout(2000);

    console.log('\n📍 STEP 2: Create New Nest');
    const newNestBtn = await page.locator('button:has-text("New Nest")').first();
    await newNestBtn.click();
    await page.waitForTimeout(2000);

    console.log('\n📍 STEP 3: Add Sheet (via Button click)');
    const sheetBtn = await page.locator('button:has-text("Sheet")').first();
    const sheetVisible = await sheetBtn.isVisible();
    console.log('Sheet button visible:', sheetVisible);
    
    if (sheetVisible) {
      await sheetBtn.click();
      await page.waitForTimeout(1500);
      
      // Fill sheet dimensions if there's a modal
      const widthInputs = await page.locator('input[type="number"]').all();
      if (widthInputs.length >= 2) {
        await widthInputs[0].fill('1000');
        await widthInputs[1].fill('500');
        console.log('✓ Set sheet dimensions: 1000 x 500');
      }
      
      // Try to click confirm button
      const confirmBtn = await page.locator('button:has-text("Confirm"), button:has-text("OK"), button:has-text("Add")').first();
      const confirmVisible = await confirmBtn.isVisible().catch(() => false);
      if (confirmVisible) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('\n📍 STEP 4: Add Part (via Button click)');
    const partBtn = await page.locator('button:has-text("Part")').first();
    const partVisible = await partBtn.isVisible();
    console.log('Part button visible:', partVisible);
    
    if (partVisible) {
      await partBtn.click();
      await page.waitForTimeout(1500);
      
      // Fill part dimensions
      const numberInputs = await page.locator('input[type="number"]').all();
      if (numberInputs.length >= 2) {
        await numberInputs[0].fill('100');
        await numberInputs[1].fill('50');
        console.log('✓ Set part dimensions: 100 x 50');
      }
      
      // Try to add part
      const addPartBtn = await page.locator('button:has-text("Confirm"), button:has-text("OK"), button:has-text("Add")').first();
      const addPartVisible = await addPartBtn.isVisible().catch(() => false);
      if (addPartVisible) {
        await addPartBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('\n📍 STEP 5: Find and Click Nest Button');
    const nestButton = await page.locator('button:has-text("Nest")').first();
    const nestVisible = await nestButton.isVisible();
    console.log('Nest button visible:', nestVisible);
    
    if (nestVisible) {
      console.log('\n🚀 CLICKING NEST BUTTON - TRIGGERING WORKER');
      await nestButton.click();
      
      // Wait and monitor for worker execution
      console.log('\n⏳ Monitoring worker execution for 15 seconds...');
      const startTime = Date.now();
      let lastLogCount = workerMessages.length;
      
      while (Date.now() - startTime < 15000) {
        const currentCount = workerMessages.length;
        if (currentCount > lastLogCount) {
          console.log(`📊 [${currentCount - lastLogCount} new messages]`);
          lastLogCount = currentCount;
        }
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('⚠️ Nest button not visible');
      await page.screenshot({ path: '/tmp/debug-nest-button.png' });
    }

    console.log('\n✓ Test completed');
    console.log(`📊 Worker Messages Captured: ${workerMessages.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

await testFullNesting();
