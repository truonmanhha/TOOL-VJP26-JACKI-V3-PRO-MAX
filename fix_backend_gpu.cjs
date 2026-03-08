const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const endpointCode = `
app.post('/api/fix-gpu', (req, res) => {
  const { exec } = require('child_process');
  
  // We execute the batch script silently
  // Because it will kill the browser, we should send the response FIRST, then execute after a short delay
  res.json({ success: true, message: 'Đang áp dụng cấu hình và khởi động lại trình duyệt bằng Card Rời...' });
  
  setTimeout(() => {
    // Run the bat file
    const batPath = require('path').join(__dirname, 'KHỞI_ĐỘNG_TOOL_GPU.bat');
    exec('"' + batPath + '"', (error) => {
        if (error) console.error('Lỗi khi chạy file BAT:', error);
    });
  }, 1000);
});

`;

content = content.replace(`app.get('/',`, `${endpointCode}\napp.get('/',`);
fs.writeFileSync('server.js', content);
console.log('Added /api/fix-gpu endpoint');
