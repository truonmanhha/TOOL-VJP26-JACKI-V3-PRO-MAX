import { chromium } from '@playwright/test';

async function testDetailedLogs() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const allLogs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    const entry = `[${msg.type().toUpperCase()}] ${text}`;
    allLogs.push(entry);
    
    // Print important logs
    if (text.includes('Error') || text.includes('Worker') || text.includes('nesting') || text.includes('✓') || text.includes('⚠')) {
      console.log(entry);
    }
  });

  try {
    console.log('📍 Loading...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    
    // Execute sequence in browser to verify data state
    await page.click('button:has-text("NESTING AX")');
    await page.waitForTimeout(1500);
    
    await page.click('button:has-text("New Nest")');
    await page.waitForTimeout(1500);
    
    // Check data state via browser evaluation
    const dataState = await page.evaluate(() => {
      // Access global state if available
      return {
        hasIndexedDB: typeof indexedDB !== 'undefined',
        hasLocalStorage: typeof localStorage !== 'undefined',
        currentUrl: window.location.href,
        documentReady: document.readyState
      };
    });
    
    console.log('\n📊 Data State:', dataState);
    
    // Add sheet with dialog
    console.log('\n📍 Adding Sheet...');
    const sheetBtn = await page.locator('button:has-text("Sheet")').first();
    await sheetBtn.click();
    await page.waitForTimeout(1500);
    
    // Fill dimensions
    const inputs = await page.locator('input[type="number"]').all();
    if (inputs.length > 0) {
      console.log(`Found ${inputs.length} input fields`);
      await inputs[0].fill('1000');
      if (inputs.length > 1) await inputs[1].fill('500');
    }
    
    // Find and click OK/Confirm
    const allButtons = await page.locator('button').all();
    let foundConfirm = false;
    for (let btn of allButtons) {
      const text = await btn.textContent();
      if (text && text.trim().match(/^(OK|Add|Confirm)$/)) {
        console.log(`Clicking button: ${text.trim()}`);
        await btn.click();
        foundConfirm = true;
        break;
      }
    }
    
    if (!foundConfirm) console.log('⚠️ Confirm button not found');
    await page.waitForTimeout(1000);
    
    // Add part
    console.log('\n📍 Adding Part...');
    await page.click('button:has-text("Part")');
    await page.waitForTimeout(1500);
    
    const inputs2 = await page.locator('input[type="number"]').all();
    if (inputs2.length > 0) {
      console.log(`Found ${inputs2.length} input fields for part`);
      await inputs2[0].fill('100');
      if (inputs2.length > 1) await inputs2[1].fill('50');
    }
    
    // Confirm part
    for (let btn of allButtons) {
      const text = await btn.textContent();
      if (text && text.trim().match(/^(OK|Add|Confirm)$/)) {
        const isVis = await btn.isVisible().catch(() => false);
        if (isVis) {
          await btn.click();
          break;
        }
      }
    }
    await page.waitForTimeout(1000);
    
    // Now click Nest and capture everything
    console.log('\n📍 Clicking Nest button...');
    await page.click('button:has-text("Nest")');
    
    console.log('⏳ Waiting 10 seconds for nesting...');
    await page.waitForTimeout(10000);
    
    // Print collected logs
    console.log('\n📋 ALL CAPTURED LOGS:');
    allLogs.filter(l => l.includes('ERROR') || l.includes('Worker') || l.includes('nesting')).forEach(l => console.log(l));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log(`\n✓ Total logs collected: ${allLogs.length}`);
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

await testDetailedLogs();
