# GCode Video Share — Fast Offscreen Render (Smooth + GPU)

## TL;DR

> **Quick Summary**: Rewrite `handleSendReport` dùng **Offscreen Three.js Renderer** với GPU đã chọn. Tool head interpolate mượt dọc đoạn thẳng (không nhảy điểm), render nhanh ~5x realtime bằng cách loại bỏ React cycle overhead. Video 10 phút → encode trong ~2 phút.
>
> **Deliverables**:
> - Offscreen `THREE.WebGLRenderer` dùng `powerPreference: gpuPreference` (GPU user đã chọn)
> - Tool head interpolation mượt: tính `progress` dọc từng segment (copy từ `simState` animate logic)
> - Hai layer geometry: `ghostLine` (toàn bộ path, mờ) + `activeLine` (draw dần theo progress)
> - Tool head sphere di chuyển mượt từng frame
> - Yield mỗi 10 frames (`await setTimeout(0)`) để browser không freeze, vẫn nhanh
> - Progress % realtime trong UI
>
> **Estimated Effort**: Medium (3-4 giờ)
> **Parallel Execution**: NO — sequential (1 file)
> **Critical Path**: Task 1 → Task 2 (QA)

---

## Context

### Original Request
Nút "Chia sẻ & Video" trong GCodeViewer cần:
1. **Render nhanh**: video 10 phút → xong trong ~2 phút (5x realtime)
2. **Mượt**: tool head di chuyển thật sự dọc đoạn thẳng, không nhảy điểm-tới-điểm
3. **GPU đúng**: dùng GPU mà user đã chọn trong setting (gpuPreference)

### Root Cause của kế hoạch cũ (đã bỏ)
- `setTimeout(r, 10)` mỗi frame = 1800 frames × 10ms = 18s overhead chỉ để chờ React
- `drawRange` nhảy theo command index = tool head nhảy điểm-điểm, không mượt
- Dùng `miniCanvasRef` (canvas nhỏ, sai source)
- Không truyền `powerPreference` vào offscreen renderer

### Giải pháp đúng

**Mượt**: Copy logic interpolation từ `simState` animate (dòng 1162-1168):
```
mỗi frame:
  targetTime = frameIndex / fps × videoDuration
  → advance cmdIdx + progress dọc segment dựa trên feed rate × playbackSpeed × deltaTime
  → lerp position = c1 + (c2-c1) × progress
  → update toolHead sphere position
  → update activeLine drawRange đến đúng vertex offset tương ứng
```

**Nhanh**: 
- `renderer.render()` synchronous — không cần `await`
- Chỉ `await setTimeout(0)` mỗi 10 frames để yield event loop
- 10 phút video @ 30fps = 18,000 frames; yield 1800 lần @ ~0ms = ~2-3s overhead total
- GPU render 1 frame ~1-5ms → 18,000 frames × 3ms = ~54s (dưới 2 phút)

**GPU**: `new THREE.WebGLRenderer({ canvas: offscreen, powerPreference: gpuPreference })`

### Key Code References Đã Nghiên Cứu
- `dòng 1147`: `playbackSpeed` = multiplier từ slider
- `dòng 1149-1177`: `simState` animate loop — đây là nguồn truth cho interpolation mượt
- `dòng 578-726`: `useMemo` build geometry (positions, colors, cmdToVert) — copy logic này
- `dòng 744-788`: `setDrawRange` để animate path
- `dòng 997`: `gpuPreference` state = `'high-performance' | 'low-power' | 'default'`
- `dòng 1733`: Main Canvas dùng `gl={{ powerPreference: gpuPreference, ... }}`

---

## Work Objectives

### Core Objective
Rewrite phần VideoEncoder trong `handleSendReport` với offscreen renderer độc lập React, interpolate tool position mượt theo feed rate thực tế, dùng GPU đã chọn.

### Concrete Deliverables
- `recordingProgress` state (0-100) mới
- Logic offscreen render trong `handleSendReport`:
  - `OffscreenCanvas(1280, 720)`
  - `THREE.WebGLRenderer({ canvas, powerPreference: gpuPreference })`
  - `ghostLine` (toàn path, opacity 0.15) + `activeLine` (draw dần)
  - `toolSphere` mesh di chuyển dọc path
  - Frame loop với interpolation đúng (không nhảy điểm)
  - Yield `await setTimeout(0)` mỗi 10 frames
- UI label: "Render X%" khi đang encode

### Definition of Done
- [ ] Video 30 giây render xong < 10 giây (không kể encode time)
- [ ] Tool head di chuyển mượt dọc đoạn thẳng (không nhảy)
- [ ] GPU panel trong app chọn RTX → video dùng RTX (không dùng Intel)
- [ ] Discord nhận attachment simulation.webm có nội dung
- [ ] Progress % hiển thị và tăng dần

### Must Have
- `powerPreference: gpuPreference` trong `THREE.WebGLRenderer`
- Interpolation mượt: `lerpVectors(c1, c2, progress)` trong frame loop
- `ghostLine` toàn path opacity thấp + `activeLine` draw range tăng dần
- `toolSphere` sphere mesh theo tool head position
- Yield mỗi 10 frames (không phải mỗi frame)
- Reset progress về 0 ở `finally`
- Cleanup: `renderer.dispose()`, `geo.dispose()`, `mat.dispose()`

### Must NOT Have (Guardrails)
- KHÔNG `setTimeout(r, N)` với N > 0 trong encode loop (gây chậm)
- KHÔNG nhảy theo command index (phải interpolate dọc segment)
- KHÔNG thay đổi SceneContent, simulation engine, miniCanvas
- KHÔNG thay đổi Discord webhook format
- KHÔNG thêm UI mới ngoài progress % trong button label

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Agent-Executed QA**: Browser DevTools + Playwright

---

## Execution Strategy

```
Task 1: Rewrite handleSendReport — offscreen renderer + smooth interpolation + GPU
Task 2: Final QA
```

---

## TODOs

- [x] 1. Rewrite `handleSendReport` — offscreen renderer, smooth tool path, GPU-aware

  **What to do**:

  ### 1a. Thêm `recordingProgress` state
  Gần `const [isReporting, setIsReporting] = useState(false);` (dòng 985):
  ```typescript
  const [recordingProgress, setRecordingProgress] = useState(0);
  ```

  ### 1b. Thay toàn bộ block `if (miniCanvasRef.current) { ... }` (dòng 1286–1441)

  Thay bằng logic sau (đọc kỹ từng bước):

  ```typescript
  // ══════════════════════════════════════════════════════════════
  // OFFSCREEN RENDERER — Fast, smooth, GPU-aware
  // ══════════════════════════════════════════════════════════════
  
  const RENDER_FPS = 30;
  const W = 1280, H = 720;
  
  // ── Bước 1: Tính tổng duration video theo playbackSpeed ───────
  // Cùng logic với simulation realtime (dòng 1294-1300 cũ)
  let totalDurationS = 0;
  for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i], c2 = commands[i + 1];
      const segLen = Math.sqrt(
          Math.pow(c2.x - c1.x, 2) +
          Math.pow(c2.y - c1.y, 2) +
          Math.pow(c2.z - c1.z, 2)
      );
      const feed = c1.f || 1000;
      const speed = (feed / 60) * playbackSpeed;
      if (speed > 0) totalDurationS += segLen / speed;
  }
  if (totalDurationS < 1) totalDurationS = 1;
  if (totalDurationS > 30) totalDurationS = 30; // cap 30s
  
  const totalFrames = Math.floor(totalDurationS * RENDER_FPS);
  const frameDeltaS = 1 / RENDER_FPS; // thời gian mỗi frame (giây)
  
  // ── Bước 2: Build geometry standalone (copy từ useMemo dòng 578-726) ──
  // Chỉ cần positions + colors + cmdToVert mapping
  const positions: number[] = [];
  const colors: number[] = [];
  const cmdToVert = new Int32Array(commands.length + 1);
  let vertCount = 0;
  
  // Màu từ theme hiện tại
  const colG0 = new THREE.Color(theme.g0);
  const colG1 = new THREE.Color(theme.g1);
  const colArc = new THREE.Color(theme.arc);
  
  for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i], c2 = commands[i + 1];
      cmdToVert[i] = vertCount;
  
      if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
      if (
          Math.abs(c1.x - c2.x) < 0.001 &&
          Math.abs(c1.y - c2.y) < 0.001 &&
          Math.abs(c1.z - c2.z) < 0.001
      ) continue;
  
      const col = c2.type === 'G0' ? colG0 : (c2.type === 'G1' ? colG1 : colArc);
      positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
      vertCount += 2;
  }
  cmdToVert[commands.length - 1] = vertCount;
  cmdToVert[commands.length] = vertCount;
  
  const totalVerts = vertCount;
  
  // ── Bước 3: Setup Three.js Offscreen Scene ────────────────────
  const offscreen = new OffscreenCanvas(W, H);
  const renderer = new THREE.WebGLRenderer({
      canvas: offscreen as any,
      antialias: false,
      powerPreference: gpuPreference, // ← GPU user đã chọn
  });
  renderer.setSize(W, H);
  renderer.setClearColor(new THREE.Color(theme.background));
  
  const scene = new THREE.Scene();
  
  // Ghost line: toàn bộ path, mờ
  const ghostGeo = new THREE.BufferGeometry();
  ghostGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ghostGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ghostMat = new THREE.LineBasicMaterial({ vertexColors: true, opacity: 0.15, transparent: true });
  const ghostLine = new THREE.LineSegments(ghostGeo, ghostMat);
  scene.add(ghostLine);
  
  // Active line: draw range tăng dần theo progress
  const activeGeo = new THREE.BufferGeometry();
  activeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  activeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  activeGeo.setDrawRange(0, 0);
  const activeMat = new THREE.LineBasicMaterial({ vertexColors: true, opacity: 1 });
  const activeLine = new THREE.LineSegments(activeGeo, activeMat);
  scene.add(activeLine);
  
  // Tool head sphere
  const sphereGeo = new THREE.SphereGeometry(
      Math.max(
          (analysis.maxX - analysis.minX) * 0.008, // ~0.8% of width
          (analysis.maxY - analysis.minY) * 0.008,
          2
      ),
      8, 8
  );
  const sphereMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const toolSphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(toolSphere);
  
  // Camera: orthographic top-down, fit bounds
  const cx = (analysis.minX + analysis.maxX) / 2;
  const cy = (analysis.minY + analysis.maxY) / 2;
  const spanX = (analysis.maxX - analysis.minX) * 1.15 || 100;
  const spanY = (analysis.maxY - analysis.minY) * 1.15 || 100;
  const aspect = W / H;
  const halfH = Math.max(spanX / aspect, spanY) / 2;
  const camera = new THREE.OrthographicCamera(
      cx - halfH * aspect, cx + halfH * aspect,
      cy + halfH, cy - halfH,
      -100000, 100000
  );
  camera.position.set(cx, cy, 1000);
  camera.lookAt(cx, cy, 0);
  
  // ── Bước 4: Setup VideoEncoder ────────────────────────────────
  let muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'V_VP8', width: W, height: H, frameRate: RENDER_FPS }
  });
  
  const encConfig = {
      codec: 'vp8',
      width: W,
      height: H,
      bitrate: 4_000_000,
      framerate: RENDER_FPS
  };
  const encSupport = await (window as any).VideoEncoder.isConfigSupported(encConfig);
  
  if (encSupport.supported) {
      const encoder = new (window as any).VideoEncoder({
          output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
          error: (e: any) => console.error('[VideoShare] encode error', e)
      });
      encoder.configure(encConfig);
      
      // ── Bước 5: Frame loop với interpolation mượt ─────────────
      // Copy logic từ simState animate (dòng 1162-1168):
      // Advance cmdIdx + progress theo feed rate × playbackSpeed × frameDelta
      
      let cmdIdx = 0;
      let segProgress = 0; // 0.0 → 1.0 dọc segment hiện tại
      
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
          // Advance simulation bằng 1 frame worth of time
          let remainingTime = frameDeltaS;
          
          while (remainingTime > 0 && cmdIdx < commands.length - 1) {
              const c1 = commands[cmdIdx];
              const c2 = commands[cmdIdx + 1];
              const segLen = Math.sqrt(
                  Math.pow(c2.x - c1.x, 2) +
                  Math.pow(c2.y - c1.y, 2) +
                  Math.pow(c2.z - c1.z, 2)
              );
              const feed = c1.f || 1000;
              // Tốc độ thực (mm/s) = (feed mm/min / 60) × playbackSpeed multiplier
              const speedMmPerSec = (feed / 60) * playbackSpeed;
              
              if (segLen < 0.0001 || speedMmPerSec <= 0) {
                  // Zero-length hoặc zero-speed segment → skip ngay
                  cmdIdx++;
                  segProgress = 0;
                  continue;
              }
              
              const segDuration = segLen / speedMmPerSec; // giây để đi hết segment
              const remainingOnSeg = segDuration * (1 - segProgress);
              
              if (remainingTime >= remainingOnSeg) {
                  // Đi hết segment này, còn dư time
                  remainingTime -= remainingOnSeg;
                  cmdIdx++;
                  segProgress = 0;
              } else {
                  // Dừng giữa segment
                  segProgress += remainingTime / segDuration;
                  remainingTime = 0;
              }
          }
          
          // Tính vị trí tool head bằng lerp
          const safeCmdIdx = Math.min(cmdIdx, commands.length - 2);
          const c1 = commands[safeCmdIdx];
          const c2 = commands[safeCmdIdx + 1] || c1;
          const toolPos = new THREE.Vector3(
              c1.x + (c2.x - c1.x) * segProgress,
              c1.y + (c2.y - c1.y) * segProgress,
              c1.z + (c2.z - c1.z) * segProgress
          );
          toolSphere.position.copy(toolPos);
          
          // Update active line draw range đến vertex tương ứng cmdIdx
          const drawVerts = cmdToVert[Math.min(cmdIdx, commands.length - 1)];
          // Ensure even number (LineSegments cần pairs)
          activeGeo.setDrawRange(0, drawVerts % 2 === 0 ? drawVerts : drawVerts - 1);
          
          // Render frame (synchronous, GPU)
          renderer.render(scene, camera);
          
          // Capture + encode
          const timestampUs = Math.round((frameIdx * 1_000_000) / RENDER_FPS);
          try {
              const frame = new (window as any).VideoFrame(offscreen, { timestamp: timestampUs });
              encoder.encode(frame, { keyFrame: frameIdx % (RENDER_FPS * 3) === 0 });
              frame.close();
          } catch (e) {
              console.error('[VideoShare] Frame encode error', e);
          }
          
          // Yield mỗi 10 frames để browser không freeze (event loop)
          // setTimeout(0) = không delay thực sự, chỉ yield
          if (frameIdx % 10 === 0) {
              setRecordingProgress(Math.round((frameIdx / totalFrames) * 100));
              await new Promise(r => setTimeout(r, 0));
          }
      }
      
      await encoder.flush();
      encoder.close();
      muxer.finalize();
      videoBlob = new Blob([muxer.target.buffer], { type: 'video/webm' });
  }
  
  // ── Cleanup ───────────────────────────────────────────────────
  ghostGeo.dispose(); ghostMat.dispose();
  activeGeo.dispose(); activeMat.dispose();
  sphereGeo.dispose(); sphereMat.dispose();
  renderer.dispose();
  // ══════════════════════════════════════════════════════════════
  ```

  ### 1c. Update `finally` block (dòng ~1464)
  Thêm `setRecordingProgress(0);` vào finally block.

  ### 1d. Update UI label (dòng 1809)
  ```tsx
  // Thay:
  {isReporting ? "Đang xử lý video..." : "Chia sẻ & Video"}
  // Thành:
  {isReporting
      ? (recordingProgress > 0 ? `Render ${recordingProgress}%` : 'Chuẩn bị...')
      : 'Chia sẻ & Video'}
  ```

  **Must NOT do**:
  - KHÔNG dùng `setTimeout(r, N)` với N > 0 trong encode loop
  - KHÔNG nhảy theo command index mà phải lerp trong segment
  - KHÔNG thay đổi Discord webhook / embed format (dòng 1446-1464)
  - KHÔNG xóa mini canvas hay miniCanvasRef
  - KHÔNG đụng SceneContent hay simulation state của React

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Reason**: Cần hiểu Three.js offscreen rendering, WebCodecs VideoEncoder, feed-rate interpolation, và tích hợp với existing state

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task F1 (QA)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `components/GCodeViewer.tsx:1151-1177` — **QUAN TRỌNG NHẤT**: `simState` animate loop — đây là nguồn truth cho interpolation mượt, copy y chang logic advance `cmdIdx + segProgress`
  - `components/GCodeViewer.tsx:578-726` — Build geometry: positions[], colors[], cmdToVert[] — copy pattern này standalone
  - `components/GCodeViewer.tsx:744-788` — `activeLineRef.current.geometry.setDrawRange(0, drawLimit)` — cách animate path reveal
  - `components/GCodeViewer.tsx:1272-1464` — Toàn bộ `handleSendReport` — phần cần rewrite là block `if (miniCanvasRef.current) { ... }`
  - `components/GCodeViewer.tsx:985` — Vị trí thêm `recordingProgress` state
  - `components/GCodeViewer.tsx:1809` — UI label button

  **API/Type References**:
  - `components/GCodeViewer.tsx:997` — `gpuPreference` state: `'high-performance' | 'low-power' | 'default'`
  - `components/GCodeViewer.tsx:1147` — `playbackSpeed` useMemo — đây là multiplier cần dùng trong frame loop
  - `analysis` object: `{ minX, maxX, minY, maxY, minZ, maxZ, totalTime, toolChanges, collisionWarnings }` — dùng bounds để fit camera và sphere size
  - `theme` object: `{ g0, g1, arc, background }` — màu line và background
  - `commands` array: `GCodeCommand[]` với fields `{ x, y, z, f, s, type, code, line }`
  - `import * as THREE from 'three'` — đã có ở dòng 1
  - `import { Muxer, ArrayBufferTarget } from 'webm-muxer'` — đã có ở dòng 6

  **External References**:
  - `OffscreenCanvas` API: Chrome 69+ / Edge 79+ — constructor `new OffscreenCanvas(width, height)`
  - `VideoFrame` từ OffscreenCanvas: `new VideoFrame(offscreenCanvas, { timestamp: microseconds })` — không cần `preserveDrawingBuffer`
  - Three.js `WebGLRenderer` với OffscreenCanvas: cast `canvas as any` vì type mismatch nhưng hoạt động

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` không có error mới (pre-existing R3F JSX errors là OK, đã có sẵn)
  - [ ] Bấm nút → trong 10 giây (file nhỏ) hoặc 2 phút (file lớn) → progress đạt 100%
  - [ ] Video mở ra: tool head di chuyển dọc đoạn thẳng (không nhảy điểm)
  - [ ] GPU RTX được chọn → `renderer.info.render` hoạt động (không fallback software)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Smooth motion — tool head không nhảy điểm
    Tool: Playwright + manual video review
    Preconditions: GCode file có ít nhất 1 đoạn dài > 50mm, analysis done
    Steps:
      1. Click nút "Chia sẻ & Video"
      2. Chờ hoàn thành (alert "Đã gửi báo cáo!")
      3. Vào Discord, download file simulation.webm
      4. Mở video, quan sát chuyển động tool head
    Expected Result: Tool head di chuyển liên tục, mượt dọc đường — không teleport giữa điểm
    Failure Indicators: Tool head xuất hiện ở vị trí khác đột ngột, không có chuyển động mượt
    Evidence: .sisyphus/evidence/task-1-smooth-check.txt (ghi nhận: smooth / not smooth)

  Scenario: Render speed — file trung bình < 15 giây
    Tool: Bash (browser console timing)
    Preconditions: GCode file 500-2000 commands, analysis done
    Steps:
      1. Mở console: console.time('video')
      2. Click "Chia sẻ & Video"
      3. Chờ alert
      4. console.timeEnd('video')
    Expected Result: Thời gian < 15 giây (thay vì 1-3 phút realtime cũ)
    Failure Indicators: > 30 giây, browser freeze, no response
    Evidence: .sisyphus/evidence/task-1-timing.txt

  Scenario: Progress % tăng dần
    Tool: Playwright
    Preconditions: GCode loaded, analysis done
    Steps:
      1. page.click('button:has-text("Chia sẻ & Video")')
      2. await page.waitForTimeout(1000)
      3. const t1 = await page.textContent('.text-\\[10px\\].font-bold')
      4. await page.waitForTimeout(2000)
      5. const t2 = await page.textContent('.text-\\[10px\\].font-bold')
      6. Assert t1 !== t2 (progress đã thay đổi)
    Expected Result: t1 = "RENDER 5%", t2 = "RENDER 20%" (numbers differ)
    Failure Indicators: t1 === t2 (stuck), text = "ĐANG XỬ LÝ VIDEO..." (không update)
    Evidence: .sisyphus/evidence/task-1-progress-t1.png, task-1-progress-t2.png

  Scenario: GPU đúng — powerPreference được truyền
    Tool: Bash (browser console)
    Preconditions: User đã chọn "high-performance" GPU
    Steps:
      1. Set gpuPreference = 'high-performance' trong UI
      2. Click "Chia sẻ & Video"
      3. Trong console, check: không có warning "Low power GPU used"
      4. Check Network tab: POST to Discord webhook succeeded (200/204)
    Expected Result: No GPU fallback warning, Discord POST success
    Evidence: .sisyphus/evidence/task-1-gpu-network.png (Network tab screenshot)

  Scenario: Edge case — commands rỗng / chưa load file
    Tool: Playwright
    Preconditions: App mới mở, chưa load GCode
    Steps:
      1. Tìm nút "Chia sẻ & Video"
      2. Check attribute: button[disabled]
    Expected Result: Nút bị disabled (vì `!analysis` = true)
    Failure Indicators: Nút click được, JS error về commands.length
    Evidence: .sisyphus/evidence/task-1-disabled.png
  ```

  **Commit**: YES
  - Message: `feat(gcode-viewer): fast offscreen video render with smooth tool interpolation`
  - Files: `components/GCodeViewer.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave

- [x] F1. **Full E2E QA** — `unspecified-high`

  Test với 3 loại file:
  - File nhỏ: < 500 commands → expect render < 5 giây
  - File trung bình: 500-3000 commands → expect render < 20 giây
  - File lớn: > 5000 commands → expect render < 2 phút

  Với mỗi file:
  1. Load → AI Analysis → Click "Chia sẻ & Video"
  2. Đo thời gian bằng `console.time()`
  3. Download video từ Discord, kiểm tra visually: tool head mượt không?
  4. Kiểm tra console: không có error nào ngoài pre-existing R3F JSX errors
  5. Kiểm tra simulation state sau record: `currentIndex` không bị thay đổi

  Output: `VERDICT: APPROVE/REJECT` + timing report + video quality assessment

---

## Commit Strategy

- **Commit 1**: `feat(gcode-viewer): fast offscreen video render with smooth tool interpolation`
  - Files: `components/GCodeViewer.tsx`

---

## Success Criteria

```bash
# Không có TS error mới
npx tsc --noEmit

# Dev server hoạt động
npm run dev
```

### Final Checklist
- [ ] `OffscreenCanvas` + `THREE.WebGLRenderer` với `powerPreference: gpuPreference`
- [ ] Frame loop dùng `segProgress` lerp (không nhảy điểm)
- [ ] `ghostLine` (opacity 0.15) + `activeLine` (setDrawRange) + `toolSphere`
- [ ] Yield chỉ mỗi 10 frames (không phải mỗi frame)
- [ ] `recordingProgress` update + reset ở finally
- [ ] UI label "Render X%" / "Chuẩn bị..."
- [ ] Cleanup `renderer.dispose()` + geometry dispose
- [ ] Discord format không thay đổi
- [ ] Mini canvas / simulation engine không bị đụng
