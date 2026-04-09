- Extracted motion parity logic into `advanceMotion` inside `services/gcodeMotionHelper.ts`.
- Ensures both realtime preview and upcoming video renderer share identical motion physics.
- GCodeViewer `simState` and interpolation accurately mapped.
## 2026-03-09 — Learnings từ code hiện tại

- Playback realtime hiện tại tính `travelDist = (feed/60) * playbackSpeed * delta` và nội suy theo segment (`index + progress`) trong loop `requestAnimationFrame`.
- `playbackSpeed` đang là nonlinear map từ `speedSliderVal` (đoạn <=40 tuyến tính nhẹ, >40 cubic tăng mạnh).
- Parser `gcodeService.ts` đã carry modal feed qua `activeF`; command không có F vẫn có thể kế thừa feed trước đó.
- Playback hiện tại đã có xử lý an toàn độ dài segment gần 0 bằng `safeLen` để tránh chia 0.
- Khi viết spec cho export deterministic, cần bám đúng các nguồn truth trên để không lệch motion parity.
- 2026-03-09 F4 scope fidelity: No tracked modifications detected in `components/nesting/`; branch diff vs merge-base is empty, indicating no code contamination from this task context.

### Task 18: Video Export Speed Semantics
- Issue: GCode viewer video export was previously tied to the raw UI slider value rather than the calculated `playbackSpeed` (which applies non-linear mapping). This made exports run at incorrect visual speeds.
- Solution: Swapped `initialSpeed: speedSliderVal` with `initialSpeed: playbackSpeed` in `GCodeViewer.tsx` where `renderVideoOffline` is called.
- Finding: The renderer runs completely decoupled from wall clock time. Testing shows that a 10x speed multiplier perfectly divides the frame count (and thus video duration) by 10, while the wall-clock render time remains only a few milliseconds.
\n- [T21] Created and ran puppeteer test to verify app stability and load sequence for export timing. No WebGL context loss errors occur, though full hardware acceleration is restricted in headless CI environments.
