import { chromium } from '@playwright/test';

async function testNetworkErrors() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Capture failed requests
  page.on('requestfailed', req => {
    console.error(`❌ FAILED REQUEST: ${req.method()} ${req.url()}`);
    console.error(`   Failure: ${req.failure().errorText}`);
  });
  
  page.on('response', res => {
    if (res.status() >= 400) {
      console.error(`⚠️  HTTP ${res.status()}: ${res.url()}`);
    }
  });

  try {
    console.log('Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'load' });
    console.log('✓ Page loaded');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

await testNetworkErrors();
