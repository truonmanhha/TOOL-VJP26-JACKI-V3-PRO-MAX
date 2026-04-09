import { chromium } from '@playwright/test';

async function testWithCorrectSelectors() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    const allLogs = [];
    page.on('console', msg => {
      allLogs.push(msg.text());
      if (msg.text().includes('Worker') || msg.text().includes('Progress') || msg.text().includes('executeNesting')) {
        console.log(`[${msg.type()}] ${msg.text()}`);
      }
    });

    console.log('📍 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // List all buttons to find the right one
    const btns = await page.locator('button').all();
    console.log(`Found ${btns.length} buttons\n`);
    
    let nestingAXBtn = null;
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('NESTING AX')) {
        nestingAXBtn = btn;
        break;
      }
    }
    
    if (nestingAXBtn) {
      console.log('✓ Found NESTING AX button');
      await nestingAXBtn.click();
      await page.waitForTimeout(2000);
    }

    // Look for New Nest button (with any spacing)
    let newNestBtn = null;
    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        newNestBtn = btn;
        console.log(`✓ Found New Nest button: "${text.trim()}"`);
        break;
      }
    }
    
    if (newNestBtn) {
      await newNestBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked New Nest button');
    }

    // Check if modal appeared
    const modals = await page.locator('[class*="modal"], [class*="dialog"]').all();
    console.log(`Modals/Dialogs found: ${modals.length}`);

    // Check for the Nest button in the modal
    const nestBtn = await page.locator('button').all();
    for (let btn of nestBtn) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        console.log('✅ FOUND NEST BUTTON!');
        console.log('🚀 CLICKING NEST BUTTON');
        await btn.click();
        
        console.log('⏳ Monitoring for worker...');
        await page.waitForTimeout(10000);
        
        const workerLogs = allLogs.filter(l => l.includes('Worker') || l.includes('Progress'));
        console.log(`\n📊 Worker logs found: ${workerLogs.length}`);
        if (workerLogs.length > 0) {
          console.log('\n✅ SUCCESS - Worker messages detected:');
          workerLogs.forEach((l, i) => console.log(`  ${i+1}. ${l}`));
        } else {
          console.log('\n⚠️ No worker logs detected');
        }
        return;
      }
    }

    console.log('⚠️ Nest button not found in modal');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testWithCorrectSelectors();
