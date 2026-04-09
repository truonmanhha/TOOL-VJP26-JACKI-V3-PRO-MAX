# UI State Machine: Video Render & Upload

## Flow & States
Quá trình tạo video từ GCode sẽ tuân theo 1 luồng đi thẳng, không cần confirm qua nhiều bước:

1. **`idle`**: Nút hiển thị mặc định khi có GCode load xong.
2. **`rendering`**: Đang chạy toolpath vẽ từng frame offline.
3. **`uploading`**: Đã ra file WebM, đang đẩy lên proxy backend.
4. **`success`**: Đẩy thành công, sau đó tự reset về `idle`.
5. **`render_error`**: Lỗi khi WebCodecs encode hoặc render frame.
6. **`upload_error`**: Proxy backend hoặc Discord từ chối.
7. **`oversize_error`**: File vượt giới hạn trước khi đẩy.

## Labels & Texts (User-facing)
- **Nút bấm (Idle)**: `Chia sẻ video` hoặc `Tạo video Discord`
- **Rendering text**: `Đang dựng video (%d%)` (kèm progress)
- **Uploading text**: `Đang gửi lên Discord...`
- **Success text**: `Đã gửi thành công!`
- **Lỗi Render**: `Lỗi khi tạo file video. Trình duyệt không hỗ trợ hoặc đầy bộ nhớ.`
- **Lỗi Upload**: `Không thể gửi lên Discord lúc này. Vui lòng thử lại sau.`
- **Lỗi Oversize**: `Video tạo ra quá phức tạp, vượt quá giới hạn 8MB của Discord.`

## Vị trí UI Đề Xuất
- **Khuyến nghị chính**: Ngay tại Panel "Kết quả phân tích" (AI chat panel) ở cột phải `GCodeViewer.tsx` (tương tự chỗ nút Report cũ). Khi đang chạy, nguyên vùng chứa nút sẽ chuyển thành thanh progress bar.
- **Phương án phụ**: Góc trái dưới của màn hình 3D (overlay). Nhưng vì đã có full-screen controls, nên để ở panel bên phải là an toàn nhất.

## UX Rules
- Không mở modal/dialog chắn màn hình. Text hiện inline ngay tại nút bấm.
- Nếu lỡ gặp lỗi, thông báo lỗi hiện 3 giây rồi tự đưa UI quay lại `idle`.
- Không có nút "Tải về" (Local Download) theo đúng yêu cầu user.