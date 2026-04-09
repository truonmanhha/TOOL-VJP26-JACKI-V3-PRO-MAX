import { chromium } from '@playwright/test';

async function testDirectDbAdd() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      if (text.includes('Worker') || text.includes('executeNesting') || text.includes('✓') || text.includes('Progress')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    console.log('📍 Loading...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);

    console.log('✓ Page loaded');

    // Try to access db from page context
    const dbResult = await page.evaluate(() => {
      if (typeof window.db !== 'undefined') {
        console.log('✓ window.db is accessible');
        return { hasDb: true };
      }
      return { hasDb: false };
    });
    
    console.log('DB accessible from JS context:', dbResult.hasDb);

    // Click NESTING AX and create a nest list
    const btns = await page.locator('button').all();
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1500);

    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1500);

    // Now try to add parts and sheets directly if db is accessible
    const addResult = await page.evaluate(() => {
      try {
        if (typeof window.db === 'undefined') {
          return { success: false, error: 'db not found' };
        }

        // Get the active list (should be the one we just created)
        const lists = window.db.getNestLists();
        if (lists.length === 0) {
          return { success: false, error: 'No nest lists found' };
        }

        const activeListId = lists[lists.length - 1].id;
        
        // Add a sheet
        const sheet = window.db.addSheet({
          nestListId: activeListId,
          name: 'Sheet 1',
          dimensions: '1000x500',
          thickness: 1,
          material: 'AL',
          cost: 0
        });
        console.log('✓ Added sheet:', sheet.name);

        // Add a part
        const part = window.db.addPart({
          nestListId: activeListId,
          name: 'Part 1',
          dimensions: '100x50',
          required: 1,
          priority: 1,
          mirrored: false,
          rotation: 0,
          smallPart: false,
          kitNumber: ''
        });
        console.log('✓ Added part:', part.name);

        return {
          success: true,
          partId: part.id,
          sheetId: sheet.id,
          listId: activeListId
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    console.log('\n📊 DB manipulation result:', addResult);

    if (!addResult.success) {
      console.log('⚠️ Could not add parts/sheets directly');
      return;
    }

    console.log('\n✅ Parts and sheets added successfully!');
    await page.waitForTimeout(1000);

    // Now try to click Nest
    const nestBtns = await page.locator('button').all();
    for (let btn of nestBtns) {
      const text = await btn.textContent();
      if (text && text.trim() === 'Nest') {
        console.log('\n🚀 CLICKING NEST BUTTON');
        await btn.click();
        
        console.log('⏳ Monitoring worker for 15 seconds...');
        await page.waitForTimeout(15000);
        
        const workerLogs = allLogs.filter(l => l.includes('Worker') || l.includes('executeNesting') || l.includes('Progress'));
        console.log(`\n📊 Worker logs found: ${workerLogs.length}`);
        if (workerLogs.length > 0) {
          console.log('\n✅ WORKER EXECUTED! Logs:');
          workerLogs.forEach(l => console.log('  ' + l));
        } else {
          console.log('\n⚠️ No worker logs');
        }
        return;
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close();
  }
}

await testDirectDbAdd();
