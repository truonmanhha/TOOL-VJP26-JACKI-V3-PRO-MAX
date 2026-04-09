# Guardrails Video Export

## Defaults Bắt Buộc
- **Độ phân giải:** `1280x720` (720p). Cân bằng giữa nhìn rõ đường dao và giữ dung lượng file thấp.
- **Tốc độ khung hình:** `60 FPS`. Cần thiết để chuyển động GCode mượt giống realtime playback nhất.
- **Định dạng:** `WebM` (`video/webm; codecs=vp8` hoặc `vp9`). Không dùng MP4 vì WebCodecs support MP4 bị hạn chế trên một số trình duyệt.

## Bitrate Recommendation
- Khuyến nghị `bitrate = 2_500_000` (2.5 Mbps). GCode chỉ vẽ vector nên không cần bitrate quá cao như video đời thực. File sẽ gọn.

## Tại sao không dùng MediaRecorder / captureStream?
- MediaRecorder bắt buộc phải gắn với wall-clock time thật, tức là mô phỏng dài 10 phút thì phải đợi đủ 10 phút để quay.
- Render bằng WebCodecs + fixed timeline 1/60 step cho phép dựng video nhanh gấp nhiều lần tốc độ thật (adaptive rendering) mà motion vẫn mượt.

## File-Size Guard
- **Giới hạn:** `7.5 MB` (Discord miễn phí giới hạn file 8MB).
- Trình duyệt/client phải tự đếm byte. Nếu blob thu được > 7.5 MB -> Hủy ngay lập tức không gọi API proxy.

## Oversize Error Text (UI)
- Lỗi hiển thị cho user: `"Video tạo ra quá dài hoặc chi tiết phức tạp làm vượt giới hạn dung lượng của Discord. Vui lòng thử lại với file GCode ngắn hơn."`
