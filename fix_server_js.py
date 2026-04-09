import re

with open('server.js', 'r') as f:
    content = f.read()

# Make sure we have fetch available, let's use the native one
upload_code = """
// ============ Discord Video Upload Endpoint ============
const memoryUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/discord-video', memoryUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'Không có file video được tải lên' });
  }

  // Check file size (7.5MB limit)
  const maxSize = 7.5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(413).json({ ok: false, message: 'File video quá lớn. Giới hạn là 7.5MB' });
  }

  const webhookUrl = process.env.VIDEO_WEBHOOK_URL || 'https://discord.com/api/webhooks/1462471174201151724/K_-DjmjGGTvAjc49oXJmYwf_IvfD6FBFiAeWO9I9yFvx4qN2xcSoJ8PuJs2Z055WrLS1';

  try {
    const formData = new FormData();
    
    // Add JSON payload if present
    if (req.body.payload_json) {
      formData.append('payload_json', req.body.payload_json);
    }
    
    // Convert Buffer to Blob for fetch API
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', fileBlob, req.file.originalname || 'video.webm');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'VJP26-Server/1.0'
      }
    });

    if (response.ok) {
      res.json({ ok: true, message: 'Đã gửi video thành công' });
    } else {
      const errorText = await response.text();
      console.error('[Discord Video Error]', errorText);
      res.status(response.status).json({ ok: false, message: `Lỗi từ Discord: ${response.status}` });
    }
  } catch (error) {
    console.error('[Discord Video Exception]', error);
    res.status(500).json({ ok: false, message: `Lỗi máy chủ: ${error.message}` });
  }
});
"""

# Insert before the catch-all or discord proxy
if "app.post('/api/discord'," in content:
    content = content.replace("app.post('/api/discord',", upload_code + "\napp.post('/api/discord',")
else:
    content = content.replace("app.get('/',", upload_code + "\napp.get('/',")

with open('server.js', 'w') as f:
    f.write(content)
