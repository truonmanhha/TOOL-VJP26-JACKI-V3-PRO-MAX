import { chromium } from '@playwright/test';

async function testWorkerMonitoring() {
  const browser = await chromium.launch({ headless: false, devtools: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  console.log('🔍 Setting up monitoring...\n');

  // Intercept all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
  });

  // Listen for page load errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('📍 STEP 1: Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    console.log('📍 STEP 2: Click NESTING AX');
    await page.locator('button:has-text("NESTING AX")').click();
    await page.waitForTimeout(2000);

    console.log('📍 STEP 3: Create New Nest');
    await page.locator('button:has-text("New Nest")').first().click();
    await page.waitForTimeout(2000);

    console.log('📍 STEP 4: Add Sheet');
    await page.locator('button:has-text("Sheet")').first().click();
    await page.waitForTimeout(1500);
    
    // Try to fill and confirm sheet
    const inputs1 = await page.locator('input[type="number"]').all();
    if (inputs1.length >= 2) {
      await inputs1[0].fill('1000');
      await inputs1[1].fill('500');
    }
    
    const confirmBtn = await page.locator('button').all();
    for (let btn of confirmBtn) {
      const text = await btn.textContent();
      if (text && (text.includes('OK') || text.includes('Add') || text.includes('Confirm'))) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    console.log('📍 STEP 5: Add Part');
    await page.locator('button:has-text("Part")').first().click();
    await page.waitForTimeout(1500);
    
    const inputs2 = await page.locator('input[type="number"]').all();
    if (inputs2.length >= 2) {
      await inputs2[0].fill('100');
      await inputs2[1].fill('50');
    }
    
    for (let btn of confirmBtn) {
      const text = await btn.textContent();
      if (text && (text.includes('OK') || text.includes('Add') || text.includes('Confirm'))) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
          await btn.click();
          break;
        }
      }
    }
    await page.waitForTimeout(1000);

    console.log('\n📍 STEP 6: Click Nest Button - WORKER SHOULD START HERE');
    const nestBtn = await page.locator('button:has-text("Nest")').first();
    await nestBtn.click();
    
    // Clear previous messages
    consoleMessages.length = 0;
    
    // Monitor for state changes by checking DOM
    console.log('\n⏳ Monitoring state changes for 20 seconds...\n');
    const startTime = Date.now();
    let lastProgressBar = null;
    let lastStatus = null;
    
    while (Date.now() - startTime < 20000) {
      // Check if progress bar exists or status changed
      const progressElements = await page.locator('[role="progressbar"]').all();
      const statusElements = await page.locator('text=/Initializing|progress|complete|nesting/i').all();
      
      const currentStatus = statusElements.length > 0 ? await statusElements[0].textContent() : null;
      
      if (currentStatus && currentStatus !== lastStatus) {
        console.log(`📊 Status Update: ${currentStatus}`);
        lastStatus = currentStatus;
      }
      
      if (progressElements.length > 0 && !lastProgressBar) {
        console.log('✓ Progress bar detected - worker is executing!');
        lastProgressBar = true;
      }
      
      await page.waitForTimeout(1000);
    }

    console.log('\n✓ Monitoring complete');

    // Check final state
    const finalMessage = await page.locator('text=/completed|failed|success/i').first().textContent().catch(() => null);
    console.log('\nFinal result:', finalMessage || 'No completion message found');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log(`\n📊 Console messages captured: ${consoleMessages.length}`);
    console.log(`⚠️ Page errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(err => console.log('  -', err));
    }
    
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

await testWorkerMonitoring();
