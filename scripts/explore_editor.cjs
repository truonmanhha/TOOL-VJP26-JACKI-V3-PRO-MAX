const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const editorUrl = 'https://web.autocad.com/acad/me/drawings/new/editor';
  const interactionLog = [];

  console.log('🚀 Đang khám phá Editor...');
  try {
    await page.goto(editorUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000); // Đợi shell load và render

    // --- Click Ribbon Buttons ---
    const ribbonButtons = [
      { selector: 'button[title="Line"]', name: 'Line' },
      { selector: 'button[title="Circle"]', name: 'Circle' },
      { selector: 'button[title="Trim"]', name: 'Trim' },
      { selector: 'button[title="Move"]', name: 'Move' },
      { selector: 'button[title="Text"]', name: 'Text' },
    ];

    for (const btn of ribbonButtons) {
      console.log(`Clicking ${btn.name} button...`);
      const buttonElement = await page.$(btn.selector);
      if (buttonElement) {
        await buttonElement.click();
        await page.waitForTimeout(1000); // Đợi hiệu ứng
        const commandLineText = await page.evaluate(() => document.querySelector('input[placeholder*="command"]')?.value || '');
        interactionLog.push({
          action: `Click ${btn.name}`,
          commandLine: commandLineText,
          screenshot: `editor_${btn.name.toLowerCase()}_click.png`,
          styles: await page.evaluate(() => {
            const getStyles = (sel) => {
              const el = document.querySelector(sel);
              return el ? JSON.parse(JSON.stringify(window.getComputedStyle(el))) : null;
            };
            return {
              ribbonBtn: getStyles(btn.selector),
              commandInput: getStyles('input[placeholder*="command"]')
            };
          })
        });
        await page.screenshot({ path: `editor_${btn.name.toLowerCase()}_click.png` });
      } else {
        console.log(`Button ${btn.name} not found.`);
      }
    }

    // --- Click Sidebar Tabs ---
    const sidebarTabs = [
      { selector: 'button[title="Draw"]', name: 'Draw Sidebar' },
      { selector: 'button[title="Layers"]', name: 'Layers Sidebar' },
      { selector: 'button[title="Properties"]', name: 'Properties Sidebar' },
    ];

    for (const tab of sidebarTabs) {
      console.log(`Clicking ${tab.name} tab...`);
      const tabElement = await page.$(tab.selector);
      if (tabElement) {
        await tabElement.click();
        await page.waitForTimeout(1000); // Đợi flyout
        interactionLog.push({
          action: `Click ${tab.name}`,
          screenshot: `editor_${tab.name.toLowerCase().replace(' ', '_')}_click.png`,
          styles: await page.evaluate(() => {
            const getStyles = (sel) => {
              const el = document.querySelector(sel);
              return el ? JSON.parse(JSON.stringify(window.getComputedStyle(el))) : null;
            };
            return {
              sidebarTab: getStyles(tab.selector),
              flyoutPanel: getStyles('.acad-sidebar-flyout') // Giả định class này
            };
          })
        });
        await page.screenshot({ path: `editor_${tab.name.toLowerCase().replace(' ', '_')}_click.png` });
      } else {
        console.log(`Tab ${tab.name} not found.`);
      }
    }


  } catch (error) {
    console.error('❌ Lỗi Playwright Explorer:', error.message);
  } finally {
    fs.writeFileSync('autocad_editor_interactions.json', JSON.stringify(interactionLog, null, 2));
    console.log('✅ Đã ghi log tương tác Editor vào autocad_editor_interactions.json');
    await browser.close();
  }
})();
