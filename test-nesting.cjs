const puppeteer = require('puppeteer-core');
const WS = 'ws://127.0.0.1:9222/devtools/browser/053a5dc3-945e-43a8-b408-32699e40f64b';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserWSEndpoint: WS });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'PAGE_ERROR', text: err.message }));

  const clickByText = async (txt) => {
    return page.evaluate((t) => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(t));
      if (btn) { btn.click(); return true; }
      return false;
    }, txt);
  };

  console.log('=== STEP 1: Open Nest List window by double-clicking list item ===');
  const listItemClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*'));
    const nestItem = items.find(el => el.textContent.includes('Nest List 1') && el.tagName !== 'BODY' && el.tagName !== 'HTML' && el.offsetHeight > 0 && el.offsetHeight < 100);
    if (nestItem) {
      nestItem.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      return nestItem.textContent.trim().substring(0, 80);
    }
    return null;
  });
  console.log('Double-clicked list item:', listItemClicked);
  await wait(1500);
  await page.screenshot({ path: '/tmp/nesting-step1.png' });

  console.log('\n=== STEP 2: Add sheet via DB programmatically ===');
  const addedSheet = await page.evaluate(() => {
    const DB_KEY = 'nesting_workspace_lists';
    const lists = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    if (lists.length > 0) {
      if (!lists[0].sheets) lists[0].sheets = [];
      lists[0].sheets.push({
        id: 'test-sheet-1',
        name: 'Steel SS400',
        width: 2440,
        height: 1220,
        thickness: 3,
        quantity: 2,
        material: 'SS400'
      });
      localStorage.setItem(DB_KEY, JSON.stringify(lists));
      return lists[0].sheets;
    }
    return null;
  });
  console.log('Added sheet to DB:', JSON.stringify(addedSheet));

  console.log('\n=== STEP 3: Add part via DB programmatically ===');
  const addedPart = await page.evaluate(() => {
    const DB_KEY = 'nesting_workspace_lists';
    const lists = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    if (lists.length > 0) {
      if (!lists[0].parts) lists[0].parts = [];
      lists[0].parts.push({
        id: 'test-part-1',
        name: 'Bracket A',
        width: 200,
        height: 150,
        quantity: 10,
        rotation: 'free',
        priority: 1
      });
      lists[0].parts.push({
        id: 'test-part-2',
        name: 'Flange B',
        width: 300,
        height: 300,
        quantity: 5,
        rotation: 'fixed',
        priority: 2
      });
      localStorage.setItem(DB_KEY, JSON.stringify(lists));
      return lists[0].parts;
    }
    return null;
  });
  console.log('Added parts to DB:', JSON.stringify(addedPart));

  console.log('\n=== STEP 4: Reload page and check NestingAX state ===');
  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });
  await wait(3000);

  await clickByText('NESTING AX');
  await wait(2000);
  await page.screenshot({ path: '/tmp/nesting-step4.png' });

  const reloadedState = await page.evaluate(() => {
    const DB_KEY = 'nesting_workspace_lists';
    const lists = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    return {
      listCount: lists.length,
      firstList: lists[0] ? {
        name: lists[0].name,
        partCount: (lists[0].parts || []).length,
        sheetCount: (lists[0].sheets || []).length,
        status: lists[0].status
      } : null
    };
  });
  console.log('Reloaded state:', JSON.stringify(reloadedState, null, 2));

  console.log('\n=== STEP 5: Test Nest Parts button ===');
  await clickByText('Nest\nParts');
  await wait(2000);
  await page.screenshot({ path: '/tmp/nesting-step5-nestparts.png' });

  console.log('\n=== STEP 6: Test sidebar tools ===');
  const sidebarTests = ['Part\nLibrary', 'Manual\nNest', 'Nesting\nInfo', 'Layers'];
  for (const label of sidebarTests) {
    const clicked = await clickByText(label);
    console.log(`Sidebar "${label}": ${clicked ? 'OK' : 'NOT FOUND'}`);
    await wait(800);
    await page.screenshot({ path: `/tmp/nesting-sidebar-${label.replace(/\n/g, '-')}.png` });
    await wait(200);
  }

  console.log('\n=== STEP 7: Test footer bar buttons ===');
  const footerTests = ['SNAP', 'ORTHO', 'DYN'];
  for (const label of footerTests) {
    await clickByText(label);
    await wait(300);
    const state = await page.evaluate((lbl) => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === lbl);
      return btn ? { text: btn.textContent, classes: btn.className.substring(0, 100) } : null;
    }, label);
    console.log(`Footer "${label}":`, state ? 'toggled' : 'not found');
  }
  await page.screenshot({ path: '/tmp/nesting-step7-footer.png' });

  console.log('\n=== CONSOLE SUMMARY ===');
  const errors = consoleLogs.filter(l => l.type === 'error' || l.type === 'PAGE_ERROR');
  console.log(`Total logs: ${consoleLogs.length}, Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  [${e.type}] ${e.text}`));
  consoleLogs.filter(l => l.type === 'log').slice(-10).forEach(l => console.log(`  [log] ${l.text}`));

  browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
