
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
// Note: fetch is globally available in Node 18+. 
// If running on older Node, you might need to import 'node-fetch' or similar.

const app = express();
const port = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bộ nhớ đệm lưu IP để chống spam (Cooldown 60s)
const visitCache = new Map();
const SPAM_COOLDOWN = 60 * 1000; 

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.dwg' || ext === '.dxf') {
      cb(null, true);
    } else {
      cb(new Error('Only .dwg and .dxf files are allowed'));
    }
  }
});

app.use(express.json({ limit: '5mb' }));

// ============ DWG to DXF Conversion Endpoint ============
app.post('/api/convert-dwg-to-dxf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}.dxf`);

  try {
    console.log('📄 Converting DWG to DXF:', req.file.originalname);

    // Try using dwg2dxf CLI if available
    await convertDwgToDxfCli(inputPath, outputPath);

    // Read the converted DXF file
    const dxfContent = fs.readFileSync(outputPath, 'utf-8');
    console.log('✓ DWG conversion successful');

    res.json({ ok: true, dxfContent });
  } catch (error) {
    console.error('✗ DWG conversion error:', error.message);
    res.status(500).json({ ok: false, message: error.message });
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      console.log('🔄 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup error:', cleanupError.message);
    }
  }
});

// Helper function: Convert DWG to DXF using CLI
function convertDwgToDxfCli(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Try dwg2dxf (LibreDWG)
    const proc = spawn('dwg2dxf', [inputPath, outputPath], { timeout: 30000 });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`dwg2dxf failed: ${stderr || stdout || 'Unknown error'}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`dwg2dxf not available: ${err.message}`));
    });
  });
}

// Proxy cho việc Xuất dữ liệu Discord để tránh lỗi CORS từ Browser
app.post('/api/discord', async (req, res) => {
  const webhookUrl = process.env.REPORT_WEBHOOK_URL || 'https://discord.com/api/webhooks/1462471174201151724/K_-DjmjGGTvAjc49oXJmYwf_IvfD6FBFiAeWO9I9yFvx4qN2xcSoJ8PuJs2Z055WrLS1';
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'VJP26-Server/1.0'
      },
      body: JSON.stringify(req.body)
    });
    
    if (response.ok) {
      res.json({ ok: true });
    } else {
      const errorText = await response.text();
      console.error('[Discord Error]', errorText);
      res.status(response.status).json({ ok: false, message: errorText });
    }
  } catch (error) {
    console.error('[Discord Proxy Exception]', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.post('/api/visit', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // const userAgent = req.headers['user-agent'] || 'Không rõ thiết bị'; // Unused
  const currentTime = Date.now();

  const lastVisit = visitCache.get(ip);
  if (lastVisit && (currentTime - lastVisit < SPAM_COOLDOWN)) {
    return res.status(429).json({ ok: false });
  }

  visitCache.set(ip, currentTime);

  const webhookUrl = process.env.TRACKING_WEBHOOK_URL || 'https://discord.com/api/webhooks/1462460415744413861/ZLLqKcL9X7tAIEZyQtuwGPzfCY42toW_zgB8A9_bamVqB5H-l51EpsRso73kHGkmlB9g';
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: "có gián điệp",
        embeds: [{
          title: "🚨 CẢNH BÁO TRUY CẬP VJP26",
          color: 15158332,
          fields: [
            { name: "Địa chỉ IP", value: `\`${ip}\``, inline: true },
            { name: "Thời gian", value: new Date().toLocaleString('vi-VN'), inline: true }
          ],
          footer: { text: "Hệ thống bảo mật VJP26 Jacki V3" }
        }]
      })
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false });
  }
});


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


app.get('/', (req, res) => res.send('VJP26 API Active (Proxy Mode)'));

app.listen(port, () => {
  console.log(`VJP26 BACKEND STARTED ON PORT: ${port}`);
});
