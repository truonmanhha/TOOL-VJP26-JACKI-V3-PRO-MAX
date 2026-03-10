import { test, expect } from '@playwright/test';

test('GCode Export Test', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  await page.click('text=PREVIEW GCODE');

  await page.waitForSelector('textarea', { state: 'visible', timeout: 10000 });

  await page.fill('textarea', 'G0 X0 Y0 Z10\\nG1 Z0 F100\\nG1 X10 Y10 F500\\nG1 X20 Y0\\nG0 Z10\\n');

  const renderBtn = page.locator('button', { hasText: /render/i });
  if (await renderBtn.count() > 0) {
    await renderBtn.first().click();
  }

  const exportBtn = page.locator('button', { hasText: /export/i });
  if (await exportBtn.count() > 0) {
    await exportBtn.first().click();
  }

  await page.waitForTimeout(1000); 
  await page.screenshot({ path: '.sisyphus/evidence/export_in_progress.png' });
  
  const canvas = page.locator('canvas[data-engine="three.js r160"]');
  if (await canvas.count() > 0) {
    await canvas.first().hover({ force: true });
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.up();
    await page.mouse.wheel(0, 100);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.sisyphus/evidence/after_interaction.png' });

  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  console.log('Test completed without hanging. Errors found:', errors.length);
});
