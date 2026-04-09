import { chromium } from '@playwright/test';

async function testFinal() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      if (text.includes('Worker') || text.includes('✓') || text.includes('Error')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    console.log('📍 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);
    
    console.log('\n📍 Click NESTING AX...');
    await page.click('button:has-text("NESTING AX")');
    await page.waitForTimeout(2000);

    console.log('📍 New Nest...');
    await page.click('button:has-text("New Nest")');
    await page.waitForTimeout(1500);

    console.log('📍 Add Sheet...');
    await page.click('button:has-text("Sheet")');
    await page.waitForTimeout(1200);
    
    const inputs1 = await page.locator('input[type="number"]').all();
    if (inputs1.length >= 2) {
      await inputs1[0].fill('1000');
      await inputs1[1].fill('500');
    }
    await page.waitForTimeout(500);

    console.log('📍 Add Part...');
    await page.click('button:has-text("Part")');
    await page.waitForTimeout(1200);
    
    const inputs2 = await page.locator('input[type="number"]').all();
    if (inputs2.length >= 2) {
      await inputs2[0].fill('100');
      await inputs2[1].fill('50');
    }
    await page.waitForTimeout(500);

    console.log('\n📍 CLICK NEST BUTTON - Worker should execute...\n');
    await page.click('button:has-text("Nest")');
    
    // Monitor for 12 seconds
    let startTime = Date.now();
    let foundWorkerMsg = false;
    
    while (Date.now() - startTime < 12000) {
      const recentLogs = allLogs.slice(-20);
      const workerMsg = recentLogs.find(l => l.includes('Worker') || l.includes('Progress') || l.includes('percent'));
      if (workerMsg && !foundWorkerMsg) {
        console.log('✅ WORKER MESSAGE DETECTED:', workerMsg);
        foundWorkerMsg = true;
      }
      await page.waitForTimeout(1000);
    }

    if (!foundWorkerMsg) {
      console.log('⚠️ No worker messages detected');
    }

    console.log('\n✓ Test complete');
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testFinal();
