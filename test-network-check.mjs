import { chromium } from '@playwright/test';

async function testNetworkCheck() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    const failures = [];
    page.on('requestfailed', req => {
      failures.push(`${req.method()} ${req.url()}`);
    });

    const responses = [];
    page.on('response', res => {
      if (res.status() >= 400) {
        responses.push({ status: res.status(), url: res.url() });
      }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);

    console.log('Failed requests:', failures.length);
    failures.forEach(f => console.log('  -', f));

    console.log('\nHTTP 4xx/5xx responses:', responses.length);
    responses.forEach(r => console.log(`  - [${r.status}] ${r.url.substring(r.url.length - 80)}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testNetworkCheck();
