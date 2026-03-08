# API Contract: Upload Video to Discord (Proxy)

**Endpoint:** `POST /api/discord-video`
**Mục đích:** Client gửi file video WebM đã render xong kèm nội dung tin nhắn lên proxy backend (`server.js`). Backend sẽ nhận file và forward sang webhook Discord. Trình duyệt KHÔNG được gọi webhook trực tiếp để tránh CORS và bảo mật.

## Request
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Fields bắt buộc:**
  1. `file`: File video (blob/webm).
  2. `payload_json`: Chuỗi JSON chứa metadata mô tả nội dung (format giống Discord webhook chuẩn).

**Ví dụ `payload_json`:**
```json
{
  "content": "Báo cáo mô phỏng GCode mới từ User",
  "username": "GCode Bot"
}
```

## Response (Success)
- **Status:** 200 OK
- **Body:**
```json
{
  "ok": true,
  "message": "Gửi video lên Discord thành công"
}
```

## Error Cases (Thất bại)

1. **Missing file** (Client gửi thiếu file)
   - Status: 400 Bad Request
   - Body: `{"ok": false, "message": "Không tìm thấy file video trong request"}`

2. **Invalid type** (Gửi sai định dạng)
   - Status: 400 Bad Request
   - Body: `{"ok": false, "message": "Chỉ chấp nhận file video định dạng WebM"}`

3. **Oversize limit** (Backend chặn file quá lớn trước khi gửi sang Discord)
   - Status: 413 Payload Too Large
   - Body: `{"ok": false, "message": "File video vượt quá giới hạn 8MB của Discord"}`

4. **Discord Reject** (Discord webhook trả về lỗi)
   - Status: 502 Bad Gateway
   - Body: `{"ok": false, "message": "Discord từ chối nhận file, vui lòng thử lại sau"}`

5. **Server Exception** (Lỗi mạng hoặc server sập)
   - Status: 500 Internal Server Error
   - Body: `{"ok": false, "message": "Lỗi hệ thống khi chuyển tiếp video"}`
