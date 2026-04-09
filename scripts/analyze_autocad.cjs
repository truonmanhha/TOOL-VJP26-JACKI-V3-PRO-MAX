const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('🚀 Đang truy cập AutoCAD Web Editor...');
  try {
    await page.goto('https://web.autocad.com/acad/me/drawings/935658113/editor', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Đợi một chút để xem có bị chuyển hướng đến trang login không
    await page.waitForTimeout(5000);
    const url = page.url();
    
    if (url.includes('login') || url.includes('identity')) {
      console.log('⚠️ Bị chặn bởi trang Login. Đang thực hiện phương án B: Phân tích Landing Page và Public Docs của AutoCAD Web...');
      await page.goto('https://www.autodesk.com/products/autocad/web-app', { waitUntil: 'networkidle' });
    }

    // Lấy thông tin về font, màu sắc và cấu trúc cơ bản
    const uiData = await page.evaluate(() => {
      const getStyle = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          bg: style.backgroundColor,
          color: style.color,
          font: style.fontFamily,
          padding: style.padding,
          border: style.border
        };
      };

      return {
        body: getStyle('body'),
        header: getStyle('header') || getStyle('.header'),
        sidebar: getStyle('aside') || getStyle('.sidebar'),
        canvas: getStyle('canvas') || getStyle('.canvas-container')
      };
    });

    fs.writeFileSync('autocad_ui_research.json', JSON.stringify(uiData, null, 2));
    console.log('✅ Đã trích xuất dữ liệu UI thành công vào autocad_ui_research.json');

    // Chụp ảnh màn hình để agent vision phân tích (nếu vào được)
    await page.screenshot({ path: 'autocad_reference.png', fullPage: true });

  } catch (error) {
    console.error('❌ Lỗi Playwright:', error.message);
  } finally {
    await browser.close();
  }
})();
