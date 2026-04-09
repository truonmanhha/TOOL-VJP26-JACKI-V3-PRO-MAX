import { chromium } from '@playwright/test';

async function testWorkerCreation() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Worker') || text.includes('executeNesting') || text.includes('Error') || text.includes('error')) {
      logs.push(`[${msg.type()}] ${text}`);
      console.log(`[${msg.type().toUpperCase()}] ${text}`);
    }
  });

  try {
    console.log('Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Check if WorkerManager initialization logs appear
    const workerLogs = logs.filter(l => l.includes('WorkerManager') || l.includes('Worker'));
    console.log(`\n✓ Found ${workerLogs.length} worker-related logs`);
    workerLogs.forEach(l => console.log('  ' + l));
    
    // Now trigger nesting
    console.log('\n📍 Navigating to NESTING AX...');
    await page.click('button:has-text("NESTING AX")');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("New Nest")');
    await page.waitForTimeout(1500);
    
    // Check sheet/part inputs
    const sheetInputCount = await page.locator('input[type="number"]').count();
    console.log(`Found ${sheetInputCount} number inputs`);
    
    // Try to add data programmatically via localStorage/IndexedDB if buttons don't work
    const success = await page.evaluate(async () => {
      // Try to access window.db if available
      if (typeof window.db !== 'undefined' && window.db) {
        console.log('✓ db object found');
        return true;
      }
      return false;
    });
    
    console.log('DB accessible:', success);
    
    console.log('\n⏳ Checking for nesting start...');
    const nestBtn = await page.locator('button:has-text("Nest")').isVisible().catch(() => false);
    console.log('Nest button visible:', nestBtn);
    
    if (nestBtn) {
      // Check handleStartNestingProcess logs
      console.log('\nClicking Nest...');
      await page.click('button:has-text("Nest")');
      await page.waitForTimeout(5000);
    }
    
    // Final log check
    console.log('\n📋 Final logs containing "Worker" or "executeNesting":');
    logs.filter(l => l.includes('Worker') || l.includes('execute')).forEach(l => console.log('  ' + l));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

await testWorkerCreation();
