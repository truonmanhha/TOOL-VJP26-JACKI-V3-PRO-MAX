
- Added a dedicated pure policy module (`services/exportPolicy.ts`) to separate export retime/fps decisions from UI slider state.
- Policy rule implemented: speed `> 50` selects `fast` strategy; speed `<= 50` selects `density` and increases frame density with fps capped at `90`.
- Returned config now includes typed fields (`fps`, `strategy`, `playbackSpeed`, `frameDensityMultiplier`) so downstream callers can use one source of truth.
- For export stability in GCodeViewer, create a snapshot at click-time containing cloned `commands`, copied `theme/viewOptions`, frozen `playbackSpeed`, and serialized camera transform (position/quaternion/up plus perspective params).
- Avoid passing live refs/state into offline export; use snapshot payload and derive frame rendering exclusively from snapshot data to prevent drift while React state keeps updating.
- Added shared `ExportDataSnapshot` type in `types.ts` to standardize export payload around parser outputs (`commands`, `analysis`, `rawText`).
- Updated `GCodeService.processFileAsync` return type to `Promise<ExportDataSnapshot>` so export consumers use parse result contract directly.
- In `handleVideoExport`, progress callbacks should be quantized (e.g., 10% buckets) and flushed via `requestAnimationFrame` to avoid high-frequency React updates during offline render.
- Keeping export loop updates out of main playback/view states prevents coupling that can trigger expensive viewer re-renders while exporting.
- `GCodeTimelineSampler` now derives both `playbackSpeed` and `fps` from `getExportConfig(initialSpeed)`, so low-speed (`<= x50`) exports automatically get denser sampling while high-speed paths avoid unnecessary density boost.
- Sampler frame rate is clamped to `<= 90fps` (`MAX_SAMPLER_FPS`) at construction, enforcing policy cap locally even if upstream config changes later.
- Timeline sampler now calls `getExportConfig(initialSpeed)` to derive adaptive fps policy directly in `services/gcodeTimelineSampler.ts`, so speed `<= 50` automatically receives density-oriented frame sampling.
- Even when caller passes `fps` override, sampler clamps effective fps into `[1, 90]`, preventing runaway density costs while preserving optional caller control.
- In `GCodeViewer.handleVideoExport`, wiring to new pipeline is stable when `setVideoExportState('rendering')` is set before attaching preview canvas, then `requestAnimationFrame` is awaited to ensure the existing mini preview container is mounted before appending export canvas.
- Export context should be captured from `miniCameraRef` as plain cloned transform/fov data inside snapshot object; this keeps export camera deterministic even if mini preview camera moves after export starts.
- Decouple `handleVideoExport` callback deps from live playback state (`currentIndex`, `displayPos`, `isPlaying`, `elapsedTime`) so export handler identity does not churn while simulation updates every frame.
- Task 9 wiring: `handleVideoExport` now captures parser-style snapshot (`ExportDataSnapshot`) + mini camera transform at click-time, then runs `renderVideoOffline` through `createRenderSurface` so export reads only frozen snapshot data.
- Reused the existing mini preview container by attaching export canvas directly to `videoPreviewRef.current`, preserving current UI layout and keeping main canvas untouched.
- Progress updates in export are now bucketed to 10% and flushed via RAF, reducing render-loop state churn while still showing meaningful progress in preview panel.
- Added explicit timeline timestamp fields (`timestampMicros`, `durationMicros`, `outputTime`) in `TimelineFrame` so encoder timing is not reconstructed from floating `frame.time` in renderer.
- Timestamp generation now derives from frame index (`round((n/fps)*1e6)`) to keep deterministic microsecond values and avoid cumulative floating-point drift over long exports.
- `WebMEncoder.addFrame` now accepts optional `durationMicros` and normalizes both timestamp/duration before creating `VideoFrame`, improving muxer/player compatibility for retimed output.
- Added `createRenderSurface` support in `renderVideoOffline` so the export loop can render against an isolated surface/canvas instead of relying on live UI render state.
- `GCodeViewer` export now uses two independent canvases: hidden full-size export canvas for encoding and `miniCanvas` for preview, avoiding writes to the main viewer canvas.
- Backpressure/yield behavior remains centralized in `offlineRenderer`; export progress updates stay throttled (RAF + coarse buckets) to avoid main-thread stalls.
- Task 7 retime follow-up: sampler now computes per-frame `durationMicros` from adjacent rounded timestamps (`round(n/fps*1e6)` delta) so cumulative encoded duration stays aligned to frame cadence.
- Offline renderer progress `time` now tracks `frame.outputTime` (timestamp-derived seconds), keeping reported progress time consistent with encoded WebM timeline.

## Task 11: Discord Upload Verification
- Payload type was successfully enforced.
- The existing limit of 7.5MB still handles the logic correctly, sending 413 for oversized videos.
- Small payload uploads work properly via standard multipart endpoints (`/api/discord-video`).

## Task 1: Setup Vitest
- Created pure Node `vitest.config.ts` without browser deps which allows standalone pure function testing via alias `ts-node` support.
- `package.json` integrated with script `vitest run`.

## Task 10: Unit Testing Policy
- Test suite verifies the threshold for fast/density path. FPS max limits correctly hold at 90.
- `getExportSnapshot` added as a simple JSON deep clone pure function helper to freeze state in `services/gcodeService.ts`.

## Task 12: Browser QA
- Verified in manual inspection that `createRenderSurface` completely decouples the canvas size from the `renderer`.
- Wrote playwright skeleton to test canvas interaction while `offlineRenderer` loops.
- Viết kịch bản test end-to-end bằng Playwright để mô phỏng tương tác user
- Mở Vite dev server bằng `npm run dev`
- Chọn tab `PREVIEW GCODE` (`text=PREVIEW GCODE`)
- Điền text GCode đơn giản vào ô textarea
- Bấm nút render bằng selector Regex (phải cover được chữ "Xóa & Render" vì text có thể thay đổi)
- Bấm nút export bằng selector Regex
- Tương tác pan/zoom lên canvas trong khi xuất (Dùng `hover({ force: true })` vì có div che lấp mất chuột)
- Check console xem có error phát sinh không.
- Test chạy passed (20.6s) trên server localhost:5173 và verify không có errors.
