import { chromium } from '@playwright/test';

async function testWorkerIntegration() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text()
    });
    console.log(`[${msg.type()}]`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  try {
    console.log('🌐 Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log('✓ Page loaded');
    const title = await page.title();
    console.log('Title:', title);

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Get page content
    const bodyText = await page.textContent('body');
    console.log('Page contains "NESTING AX":', bodyText.includes('NESTING AX'));

    // Look for NESTING AX button
    const nestingAxButton = await page.locator('text=NESTING AX').first();
    const isVisible = await nestingAxButton.isVisible();
    console.log('NESTING AX button visible:', isVisible);

    if (isVisible) {
      console.log('🖱️ Clicking NESTING AX button');
      await nestingAxButton.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      
      console.log('Current URL:', page.url());
      const currentText = await page.textContent('body');
      console.log('Page loaded after click - contains "Nest":', currentText.includes('Nest'));
    }

    // Check for console errors
    console.log('\n📋 Console Messages Summary:');
    const errorLogs = consoleLogs.filter(l => l.type === 'error');
    const warningLogs = consoleLogs.filter(l => l.type === 'warning');
    console.log(`Errors: ${errorLogs.length}, Warnings: ${warningLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('\n⚠️ Errors found:');
      errorLogs.forEach(log => console.log('  -', log.text));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

await testWorkerIntegration();
