import { chromium } from '@playwright/test';

async function testDebugNesting() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    const allLogs = [];
    page.on('console', msg => {
      allLogs.push({ type: msg.type(), text: msg.text() });
      // Only print errors and initialization
      if (msg.type() === 'error' || msg.text().includes('✓') || msg.text().includes('Worker')) {
        console.log(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    // Check if WorkerManager was initialized
    const hasWorkerLog = allLogs.find(l => l.text.includes('WorkerManager'));
    console.log('\n✓ WorkerManager initialized:', !!hasWorkerLog);

    await page.click('button:has-text("NESTING AX")');
    await page.waitForTimeout(1500);
    await page.click('button:has-text("New Nest")');
    await page.waitForTimeout(1000);

    // Try to find the Nest button now
    const nestBtn = await page.locator('button:has-text("Nest")');
    const isVisible = await nestBtn.isVisible().catch(() => false);
    console.log('✓ Nest button visible:', isVisible);

    if (!isVisible) {
      // Modal might not be open - let's check what buttons are visible
      const allBtns = await page.locator('button').all();
      console.log(`Found ${allBtns.length} buttons total`);
      
      // Try to find any modal or dialog
      const modals = await page.locator('[role="dialog"]').all();
      console.log(`Found ${modals.length} modal dialogs`);
      
      // Take screenshot for debugging
      await page.screenshot({ path: '/tmp/debug-buttons.png' });
      console.log('Screenshot saved to /tmp/debug-buttons.png');
      return;
    }

    // Clear previous logs
    allLogs.length = 0;

    console.log('\n🚀 CLICKING NEST BUTTON');
    await nestBtn.click();
    
    console.log('⏳ Waiting for worker execution...');
    await page.waitForTimeout(8000);

    // Check all logs for errors
    const errorLogs = allLogs.filter(l => l.type === 'error' || l.text.includes('Error') || l.text.includes('error'));
    const workerLogs = allLogs.filter(l => l.text.includes('Worker') || l.text.includes('Progress'));
    
    console.log(`\n📊 Results:`);
    console.log(`  Errors: ${errorLogs.length}`);
    console.log(`  Worker logs: ${workerLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('\n⚠️ ERRORS:');
      errorLogs.forEach(l => console.log('  -', l.text));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testDebugNesting();
