import { chromium } from '@playwright/test';

async function testNestingExecution() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    // Log worker, nesting, or error messages
    if (text.includes('Worker') || text.includes('execute') || text.includes('nesting') || text.includes('progress') || text.includes('Error') || text.includes('ERROR')) {
      console.log(`[LOG]`, text);
    }
  });

  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  try {
    console.log('🌐 Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    console.log('\n📍 Step 1: Click NESTING AX button');
    const nestingAxButton = await page.locator('button:has-text("NESTING AX")').first();
    await nestingAxButton.click();
    await page.waitForTimeout(2000);

    console.log('📍 Step 2: Click "New Nest" button');
    const newNestBtn = await page.locator('button:has-text("New Nest")').first();
    const isVisible = await newNestBtn.isVisible();
    console.log('New Nest button visible:', isVisible);
    
    if (isVisible) {
      await newNestBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked New Nest');
    }

    console.log('\n📍 Step 3: Check for Part/Sheet inputs');
    // Look for input fields to add dimensions
    const inputs = await page.locator('input[type="number"], input[type="text"]').all();
    console.log('Found', inputs.length, 'input fields');

    // Try to find and click a sheet or part input to add geometry
    const sheetButton = await page.locator('button:has-text("Sheet")').first();
    const sheetVisible = await sheetButton.isVisible().catch(() => false);
    
    if (sheetVisible) {
      console.log('✓ Found Sheet button, clicking');
      await sheetButton.click();
      await page.waitForTimeout(1500);
    }

    console.log('\n📍 Step 4: Look for Start/Nesting button');
    const startButtons = await page.locator('button').all();
    let nestingStartBtn = null;
    
    for (let btn of startButtons) {
      const text = await btn.textContent();
      if (text && (text.includes('Nesting') || text.includes('Start') || text.includes('Nest') || text.includes('Tối ưu'))) {
        console.log('Found button:', text.trim());
        const boundingBox = await btn.boundingBox();
        if (boundingBox && boundingBox.y < 400) { // Filter top buttons
          nestingStartBtn = btn;
          break;
        }
      }
    }

    if (nestingStartBtn) {
      console.log('\n📍 Step 5: Click Nesting Start button');
      await nestingStartBtn.click();
      
      console.log('⏳ Waiting for nesting to start (checking for worker messages)');
      
      // Monitor console for worker messages for 15 seconds
      let workerMessagesCount = 0;
      const startTime = Date.now();
      
      while (Date.now() - startTime < 15000) {
        const currentLogs = consoleLogs.filter(l => 
          l.includes('Worker') || l.includes('execute') || l.includes('progress') || l.includes('complete')
        );
        
        if (currentLogs.length > workerMessagesCount) {
          console.log('[WORKER UPDATE]', currentLogs[currentLogs.length - 1]);
          workerMessagesCount = currentLogs.length;
        }
        
        await page.waitForTimeout(500);
      }

      console.log('\n✓ Nesting execution monitoring complete');
    } else {
      console.log('⚠️ Could not find Nesting start button');
    }

    // Take final screenshot
    await page.screenshot({ path: '/tmp/screenshot-nesting.png' });
    console.log('Screenshot saved');

    // Print summary
    console.log('\n📋 Console Log Summary:');
    const errorLogs = consoleLogs.filter(l => l.includes('Error'));
    const workerLogs = consoleLogs.filter(l => l.includes('Worker'));
    const progressLogs = consoleLogs.filter(l => l.includes('progress'));
    
    console.log(`Total logs: ${consoleLogs.length}`);
    console.log(`Worker messages: ${workerLogs.length}`);
    console.log(`Progress updates: ${progressLogs.length}`);
    console.log(`Error messages: ${errorLogs.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

await testNestingExecution();
