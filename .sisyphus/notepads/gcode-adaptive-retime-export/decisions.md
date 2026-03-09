
- Chose linear fps scaling bands around threshold 50 to keep behavior predictable:
  - `density` branch (<=50): 60..90 fps (higher density at lower speed)
  - `fast` branch (>50): 60..30 fps (favor throughput)
- Kept playback-speed mapping compatible with existing viewer behavior to avoid regressions while extracting policy.
- Wired an import consumer in `services/benchmark.ts` to validate export/import flow for the new module without coupling policy to `GCodeViewer.tsx`.
- Updated offline renderer API to accept optional `snapshot` input instead of capturing live state via callback (`captureState` removed). This makes data ownership explicit and avoids export-time reads from mutable component state.
- In `GCodeViewer.handleVideoExport`, all export pipeline inputs now come from `getExportSnapshot()` captured once at export start; render loop uses `snapshotCommands/snapshotTheme/snapshotViewOptions/snapshotCamera` only.
- Chosen source-of-truth for export data is parser output contract (`ExportDataSnapshot`) instead of DOM/canvas state to avoid data drift between live view and export.
