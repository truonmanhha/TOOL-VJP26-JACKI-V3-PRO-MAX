# Draft: GCode Video Rebuild

## Requirements (confirmed)
- User wants to rebuild video creation feature from scratch.
- Existing video-generation approach should be fully removed first.
- User asked for multiple concept options, then will choose one.
- User clarified core behavior:
  - Video must simulate toolpath with the same motion style as realtime playback.
  - User should not have to watch realtime; system should auto-generate video and send to Discord.
  - Main challenge: keep realtime-like motion quality while rendering much faster than realtime wall-clock.
- User selected preferred mode: **Realtime-physics accelerated**.
- User selected delivery: **Auto-send to Discord**.
- User selected adaptive acceleration (policy 5A): maximize render speed while preserving realtime-like motion quality.
- User explicitly reconfirmed expected motion behavior: tool must move continuously along each line segment (point-to-point interpolation), same visual style as realtime.
- User decisions finalized:
  - No local download button.
  - Default output FPS: 60.
  - Default output resolution: 720p.
  - Output format: WebM only.
  - Discord upload retry: not required.
  - Render location: use user's machine (client-side), not server-side rendering.
  - Delivery path: client renders WebM, then sends to backend proxy for Discord forwarding.
  - Validation style: practical real-run QA (generate video and verify Discord result), no heavy test framework requirement.

## Technical Decisions
- Deterministic offline render: simulation clock decoupled from wall-clock, but uses same kinematic math as realtime playback.
- Realtime motion parity rule: preserve `simState` progression semantics (index + segment progress) and line interpolation continuity.
- Playback speed source for render is confirmed: existing `speedSliderVal` -> `playbackSpeed` mapping in GCodeViewer (do not invent new source).
- Adaptive acceleration selected: render loop runs as fast as possible with quality guardrails and encoder backpressure control.
- Output contract fixed: WebM only, no local download, no retry; client uploads WebM to backend proxy, backend forwards once to Discord.
- Visual parity intent: "như bình thường" (same as normal viewer defaults), pending exact rules for rapid/dwell visibility.

## Research Findings
- Realtime simulation source identified in `components/GCodeViewer.tsx` lines 1145-1173 (`simState` + RAF loop).
- Playback speed source identified: `speedSliderVal` from `vjp26_gc_speed` localStorage and `playbackSpeed` mapping at line 1143.
- Motion formula in realtime loop: `travelDist = (currentFeed / 60) * playbackSpeed * delta` and segment lerp at line 1164.
- Feed-rate provenance confirmed in parser: `services/gcodeService.ts` keeps modal `F` and writes `f` onto each command.
- Historical video approaches found in `components/GCodeViewer.tsx.old` and `.current`: WebCodecs + WebM muxer with MediaRecorder fallback; prior attempts caused jumpy motion and timing drift.
- Repository includes docs/guides for OffscreenCanvas worker architecture and test files for VideoEncoder support.

## Open Questions
- Need final clarification for visual defaults: whether to mirror current viewer toggles exactly for G0 rapid visibility and arc highlighting.
- Need final clarification for G4 dwell behavior: keep exact dwell duration or cap/compress for faster export while preserving perceived realtime style.

## Clarification Needed (latest)
- User said "là sao" and "chưa hiểu" for architecture + test strategy options.
- Need simpler non-technical explanation before finalizing.
- User asked: "dùng sức máy server là gì? cái nào lợi hơn" and still doesn't understand test strategy.

## Scope Boundaries
- INCLUDE: New end-to-end video generation architecture proposals.
- EXCLUDE: Implementation details until option is selected.

## Test Strategy Decision
- **Infrastructure exists**: No dedicated test runner detected for this feature.
- **Automated tests**: Pending decision.
- **Agent-Executed QA**: Required in final work plan.

## New Concern from User
- User asked why detailed GCode-to-video conversion behavior had not been clarified yet.
- User expects explicit plan details for interpolation, frame mapping, and encoding behavior.

## Latest User Preference
- User requested to review a short draft summary before generating the final work plan file.

## Communication Preference
- User requests Vietnamese and very simple, non-technical explanations (avoid specialist jargon).
