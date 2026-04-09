const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log("🚀 Đang khởi động trình duyệt có giao diện...");
  try {
    const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    
    await page.goto('https://web.autocad.com');
    
    console.log("===============================================================");
    console.log("👀 CỬA SỔ TRÌNH DUYỆT ĐÃ MỞ (Nằm trên màn hình của bạn).");
    console.log("👉 VUI LÒNG ĐĂNG NHẬP VÀ MỞ MỘT BẢN VẼ (vào Editor).");
    console.log("⏳ Hệ thống đang chờ bạn... (Timeout: 5 phút)");
    console.log("===============================================================");
    
    // Đợi người dùng vào tới trang Editor
    await page.waitForURL('**/editor**', { timeout: 300000 }); 
    
    console.log("✅ ĐÃ VÀO EDITOR! VUI LÒNG BỎ TAY KHỎI CHUỘT!");
    console.log("⏳ Đang chờ bản vẽ tải hoàn tất...");
    await page.waitForTimeout(15000); 

    const toolSpecs = [];

    console.log("🖱️ Đang thu thập danh sách công cụ...");
    // Quét toàn bộ nút bấm bên trái và các nút công cụ
    const buttons = await page.evaluate(() => {
        const getDeepAll = (selector, root = document) => {
            let elements = Array.from(root.querySelectorAll(selector));
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) elements.push(...getDeepAll(selector, el.shadowRoot));
            });
            return elements;
        };

        return getDeepAll('button, [role=\"button\"], div[title]').map(b => {
            const rect = b.getBoundingClientRect();
            // Lấy các nút có tọa độ x < 350 (thường là thanh toolbar bên trái) hoặc y < 150 (ribbon bên trên)
            if (rect.width > 0 && rect.height > 0 && (rect.x < 350 || rect.y < 150)) {
                return {
                    title: b.title || b.getAttribute('aria-label') || b.innerText,
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2
                };
            }
            return null;
        }).filter(b => b && b.title && b.title.trim().length > 1);
    });

    console.log(`🔍 Tìm thấy ${buttons.length} nút công cụ. Bắt đầu tương tác tự động...`);

    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        console.log(`👉 Phân tích công cụ: ${btn.title.replace(/\\n/g, ' ')}`);
        
        try {
            // Click vào công cụ
            await page.mouse.click(btn.x, btn.y);
            await page.waitForTimeout(1200); // Chờ Command Line cập nhật

            // Đọc trạng thái Command Line
            const promptText = await page.evaluate(() => {
                const getDeepAll = (selector, root = document) => {
                    let elements = Array.from(root.querySelectorAll(selector));
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) elements.push(...getDeepAll(selector, el.shadowRoot));
                    });
                    return elements;
                };
                
                // Thử nhiều class khác nhau của CommandLine
                const cmdEl = getDeepAll('.command-line, #command-input, [placeholder*=\"Type a command\"], [class*=\"prompt\"]')[0];
                return cmdEl ? (cmdEl.innerText || cmdEl.value || cmdEl.placeholder) : 'Không tìm thấy Command Line';
            });

            // Lấy Tooltip
            const tooltip = await page.evaluate(() => {
                const tt = document.querySelector('[role=\"tooltip\"], .tooltip, [class*=\"Tooltip\"]');
                return tt ? tt.innerText : '';
            });

            toolSpecs.push({
                toolName: btn.title.replace(/\\n/g, ' '),
                commandPrompt: promptText.trim().replace(/\\n/g, ' '),
                tooltip: tooltip.trim().replace(/\\n/g, ' ')
            });

            // Hủy lệnh 
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
            
        } catch (err) {
            console.log(`⚠️ Bỏ qua ${btn.title}: Lỗi tương tác.`);
        }
    }

    fs.writeFileSync('autocad_all_tools_behavior.json', JSON.stringify(toolSpecs, null, 2));
    console.log("===============================================================");
    console.log("📊 ĐÃ HOÀN TẤT TRẢI NGHIỆM! Dữ liệu đã lưu vào autocad_all_tools_behavior.json.");
    console.log("===============================================================");
    
    await page.waitForTimeout(3000);
    await browser.close();
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
})();
