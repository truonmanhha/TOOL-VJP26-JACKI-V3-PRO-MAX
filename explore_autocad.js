import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function explore(url, name) {
  console.log(`Exploring ${url}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(5000);

    const title = await page.title();
    console.log(`Page title: ${title}`);

    const screenshotPath = `autocad_${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);

    const html = await page.content();
    fs.writeFileSync(`autocad_${name}.html`, html);
    console.log(`HTML saved to autocad_${name}.html`);

    // Extract basic UI elements
    const elements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        id: b.id,
        className: b.className,
        rect: b.getBoundingClientRect()
      }));
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText,
        href: a.href,
        rect: a.getBoundingClientRect()
      }));
      return { buttons, links };
    });

    fs.writeFileSync(`autocad_${name}_elements.json`, JSON.stringify(elements, null, 2));
    console.log(`Elements saved to autocad_${name}_elements.json`);

  } catch (error) {
    console.error(`Error exploring ${url}:`, error);
  } finally {
    await browser.close();
  }
}

async function run() {
  await explore('https://web.autocad.com/acad/me/drawings/new/editor', 'editor');
  await explore('https://web.autocad.com/acad/me', 'me');
}

run();
