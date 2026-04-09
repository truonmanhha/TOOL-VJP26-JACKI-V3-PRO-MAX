const { chromium } = require('playwright'); // Ensure we use playwright
const fs = require('fs');

(async () => {
  console.log("🚀 Đang khởi động trình duyệt có giao diện...");
  try {
    // headless: false để hiện UI cho user đăng nhập
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    
    await page.goto('https://web.autocad.com');
    
    console.log("===============================================================");
    console.log("👀 CỬA SỔ TRÌNH DUYỆT ĐÃ MỞ (Có thể nằm dưới thanh Taskbar).");
    console.log("👉 Vui lòng đăng nhập và mở một bản vẽ bất kỳ để vào Editor.");
    console.log("⏳ Tôi có thể đợi bạn tới 5 phút...");
    console.log("===============================================================");
    
    // Đợi người dùng tự đăng nhập và vào trang có chữ '/editor'
    await page.waitForURL('**/editor**', { timeout: 300000 }); 
    
    console.log("✅ Đã phát hiện bạn vào Editor! Vui lòng không đụng chuột, để tôi trải nghiệm...");
    
    // Đợi load xong canvas
    await page.waitForTimeout(15000);
    
    console.log("🖱️ Đang click và đọc cấu trúc UI...");
    const specs = await page.evaluate(() => {
        const getDeepAll = (selector, root = document) => {
            let elements = Array.from(root.querySelectorAll(selector));
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) elements.push(...getDeepAll(selector, el.shadowRoot));
            });
            return elements;
        };

        const buttons = getDeepAll('button, [role=\"button\"], div[title]').map(b => ({
            title: b.title || b.innerText,
            rect: b.getBoundingClientRect()
        })).filter(b => b.title && b.rect.width > 0);

        const commandLine = getDeepAll('input, .command-line, [placeholder]').map(i => ({
            placeholder: i.placeholder,
            rect: i.getBoundingClientRect(),
            class: i.className
        }));

        return { buttons, commandLine, window: { w: window.innerWidth, h: window.innerHeight } };
    });

    fs.writeFileSync('autocad_live_experience.json', JSON.stringify(specs, null, 2));
    console.log("📊 Đã lấy được dữ liệu thật 100%! Ghi vào autocad_live_experience.json.");
    
    console.log("✅ Trải nghiệm xong! Trình duyệt sẽ tự đóng sau 5 giây.");
    await page.waitForTimeout(5000);
    await browser.close();
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    console.log("Có thể do WSL không hỗ trợ hiển thị GUI (giao diện) hoặc timeout.");
  }
})();
