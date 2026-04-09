import { chromium } from '@playwright/test';

async function testNestingWorkflow() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Worker') || text.includes('nesting') || text.includes('progress') || text.includes('✓') || text.includes('Error') || text.includes('ERROR')) {
      consoleLogs.push({
        type: msg.type(),
        text: text
      });
      console.log(`[${msg.type().toUpperCase()}]`, text);
    }
  });

  try {
    console.log('🌐 Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for boot animation
    await page.waitForTimeout(4000);
    
    console.log('🖱️ Looking for NESTING AX button');
    const nestingAxButton = await page.locator('button:has-text("NESTING AX")').first();
    const isVisible = await nestingAxButton.isVisible();
    
    if (isVisible) {
      console.log('✓ NESTING AX button found and visible');
      await nestingAxButton.click();
      await page.waitForTimeout(3000);
      console.log('✓ Clicked NESTING AX, waiting for app to load');
    }

    // Look for Create new Nest button
    console.log('🔍 Looking for "Create" button');
    const buttons = await page.locator('button').all();
    console.log('Found ' + buttons.length + ' buttons on page');
    
    // Try clicking first button that might be "create"
    for (let btn of buttons) {
      const text = await btn.textContent();
      console.log('Button text:', text?.trim());
      if (text && (text.includes('Create') || text.includes('Tạo') || text.includes('new') || text.includes('Mới'))) {
        console.log('✓ Found create button:', text.trim());
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/screenshot-app.png' });
    console.log('✓ Screenshot saved to /tmp/screenshot-app.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

await testNestingWorkflow();
