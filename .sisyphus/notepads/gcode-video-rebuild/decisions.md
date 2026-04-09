## 2026-03-09 — T1 conversion spec

- Chốt timeline export theo fixed-step `1/60` giây, deterministic, không dùng wall-clock làm nguồn chân lý.
- Chốt source tốc độ duy nhất: `speedSliderVal -> playbackSpeed` theo công thức hiện tại ở `GCodeViewer.tsx:1143`.
- Chốt G0 phải visible như viewer (không ẩn), vẫn đi theo feed + playbackSpeed để giữ parity behavior hiện tại.
- Chốt G4 dwell phải exact bằng accumulator thời gian (ưu tiên `P` ms, fallback `X` giây).
- Chốt edge bắt buộc: zero-length segment không NaN/crash, missing feed fallback = `1000`.
- Chốt contract upload qua proxy (T3): Dùng multipart `file` + `payload_json`, backend tự kiểm tra MIME/size rồi forward. Browser cấm gọi trực tiếp.
- Chốt guardrails xuất video (T4): 720p @ 60fps WebM, bitrate 2.5Mbps. Giới hạn client size-check = 7.5MB để không tạch Discord webhook. Cấm dùng MediaRecorder.
- Chốt UI flow xuất video (T5): Đặt trong AI panel (cột phải), text tiếng Việt cực giản ("Đang dựng video...", "Đang gửi lên Discord..."), không có file tải local. Báo lỗi thẳng, sau 3s reset về trạng thái gốc.
