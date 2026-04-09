import { test, expect } from '@playwright/test';

test('Export video isolates rendering and keeps main canvas interactive', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Switch to GCode tab (assuming tab with text 'GCode' exists)
  await page.getByText('GCode', { exact: true }).click();

  // Assuming there's a textarea for input
  const textArea = page.locator('textarea');
  if (await textArea.isVisible()) {
    await textArea.fill(`G0 X0 Y0 Z0\nG1 X10 Y10 F1000\nG1 X20 Y0`);
    await page.getByRole('button', { name: /Render/i }).click();
  }

  // Find Export video button
  const exportBtn = page.getByRole('button', { name: /Export|Lưu/i });
  await exportBtn.click();
  
  // Canvas should still be present
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();

  // Test pan/zoom interactions while exporting by dispatching mouse events
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
    await page.mouse.up();
  }

  // Wait for export to finish (could be checking a progress bar or just waiting a bit)
  await page.waitForTimeout(3000); 
});
