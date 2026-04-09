import { chromium } from '@playwright/test';

async function testGetButtonHTML() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const btns = await page.locator('button').all();
    
    for (let btn of btns) {
      if ((await btn.textContent()).includes('NESTING AX')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    for (let btn of btns) {
      const text = await btn.textContent();
      if (text && text.includes('New Nest')) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(2000);

    // Get the HTML of the Nest button
    const nestBtn = await page.locator('button:has-text("Nest")').first();
    const html = await nestBtn.innerHTML();
    console.log('Nest button innerHTML:');
    console.log(html);

    // Get the outer HTML to see the full button element
    const outerHTML = await page.locator('button:has-text("Nest")').first().evaluate(el => el.outerHTML);
    console.log('\nNest button outerHTML:');
    console.log(outerHTML.substring(0, 500));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

await testGetButtonHTML();
