# Spec: Chuyển GCode -> video timeline deterministic (60 FPS fixed-step)

## 1) Mục tiêu

- Video xuất ra phải **giữ motion như realtime viewer hiện tại** (không teleport, không nhảy điểm).
- Timeline render phải **deterministic**: cùng input thì frame nào cũng giống nhau giữa các lần chạy.
- Nguồn timing cho video export là **timeline nội bộ fixed-step**, **không dùng wall-clock** (`performance.now`, `requestAnimationFrame`) làm nguồn chân lý.

## 2) Source of truth về tốc độ

Nguồn chuẩn duy nhất:

`speedSliderVal -> playbackSpeed`

Theo đúng `components/GCodeViewer.tsx:1143`:

```ts
if (speedSliderVal <= 40) {
  playbackSpeed = 0.1 + (speedSliderVal / 40) * 1.9;
} else {
  const t = (speedSliderVal - 40) / 60;
  playbackSpeed = 2 + Math.pow(t, 3) * 500;
}
```

Không tạo nguồn speed mới. Không override bằng config riêng của export.

## 3) Timebase cố định

- `fixed-step = 1/60` giây mỗi frame.
- Mỗi vòng lặp export tăng thời gian mô phỏng đúng `dt = 1/60`.
- Render có thể chạy nhanh hơn realtime (CPU cho phép), nhưng trạng thái frame luôn tính theo `n * dt`.

## 4) Rule map command -> frame (đơn giản, bám viewer hiện tại)

### 4.1 Linear move (nội suy vị trí)

Áp dụng cho bước di chuyển giữa `commands[i] -> commands[i+1]`.

Mỗi frame:

1. Lấy feed hiện hành từ command hiện tại:
   - `currentFeed = commands[i].f` nếu `> 0`
   - fallback `1000` nếu thiếu/0
2. Tính quãng đường đi trong frame:
   - `travelDist = (currentFeed / 60) * playbackSpeed * dt`
3. Đi dọc segment bằng `progress` (0..1), nội suy tuyến tính giữa 2 điểm.
4. Nếu đi hết segment thì trừ phần đã đi, nhảy sang segment tiếp theo và tiếp tục ăn phần dư trong cùng frame.

> Ghi chú parity: cách tính trên bám logic playback realtime hiện tại ở `GCodeViewer.tsx:1157-1165`.

### 4.2 G0 (rapid) phải visible như viewer

- G0 vẫn là segment bình thường trên timeline (vẫn có frame, vẫn nội suy), **không ẩn**.
- Để giữ parity với playback hiện tại: tốc độ frame cho G0 vẫn đi theo `currentFeed/fallback 1000` + `playbackSpeed` (không tự ý ép rapid feed khác trong export spec này).
- Kết quả: đường chạy nhanh (`G0`) vẫn nhìn thấy liên tục như viewer.

### 4.3 G1/G2/G3

- Với timeline export mức T1 này, tất cả chuyển động đã parse thành chuỗi điểm đều dùng cùng cơ chế nội suy theo segment (giữ continuity).
- Nếu có arc (G2/G3) đã được biểu diễn bằng điểm đầu/cuối trong `commands`, export dùng cùng rule segment để tránh lệch behavior realtime hiện tại.

### 4.4 G4 dwell (dừng chờ) phải exact

- G4 không di chuyển vị trí, chỉ giữ nguyên tool position trong một khoảng thời gian dwell.
- Khi gặp dòng có `G4`:
  - Trích thời gian dwell từ code:
    - `P` (milliseconds) -> `dwellSeconds = P / 1000`
    - `X` (seconds) -> `dwellSeconds = X`
    - nếu có cả hai: ưu tiên `P`
  - Sinh frame giữ nguyên vị trí cho tới khi đủ `dwellSeconds` theo timeline nội bộ.
- Cách đảm bảo exact trên fixed-step:
  - dùng bộ tích lũy thời gian (`remainingDwellSeconds`), mỗi frame trừ `dt`;
  - phần lẻ < `dt` phải được giữ trong accumulator (không làm mất thời gian chờ).

## 5) Edge cases bắt buộc

### 5.1 Zero-length segment

- Nếu `segLen == 0` (hoặc rất gần 0), không chia trực tiếp gây NaN.
- Dùng ngưỡng an toàn (`safeLen`, ví dụ `max(segLen, 1e-5)`) hoặc skip segment ngay.
- Mục tiêu: không crash, không giật timeline.

### 5.2 Missing feed fallback

- Parser (`services/gcodeService.ts`) đã giữ modal feed qua `activeF`.
- Tuy nhiên vẫn phải phòng trường hợp feed thiếu/0:
  - dùng `commands[i].f` nếu hợp lệ;
  - nếu không có thì fallback `1000` (đúng playback hiện tại).

## 6) State machine export tối thiểu

- State nội bộ: `index`, `progress`, `timelineTime`, `elapsedCutTime`, `dwellRemaining`.
- Mỗi frame 60 FPS:
  1. Nếu đang dwell: giữ vị trí, trừ `dwellRemaining`.
  2. Nếu không dwell: tiêu thụ `travelDist` qua một hoặc nhiều segment.
  3. Ghi snapshot frame (position + index + metadata cần encode).
- Kết thúc khi tới command cuối và không còn dwell.

## 7) Ràng buộc không được làm

- Không dùng wall-clock làm truth cho timeline video.
- Không dùng MediaRecorder/captureStream cho path spec này.
- Không phát minh nguồn speed ngoài `speedSliderVal -> playbackSpeed`.

## 8) Assumptions (chốt từ code hiện có)

1. `commands` là danh sách đã parse có tọa độ tuyệt đối theo thứ tự chạy.
2. Feed modal đã được carry trong parser qua `activeF`, nhưng export vẫn giữ fallback an toàn 1000.
3. Mục tiêu T1 là chốt conversion rule deterministic để làm nền cho T6/T8/T11, chưa đổi behavior playback realtime hiện tại.
