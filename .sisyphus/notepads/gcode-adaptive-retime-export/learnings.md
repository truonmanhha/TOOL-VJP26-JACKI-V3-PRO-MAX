
- Added a dedicated pure policy module (`services/exportPolicy.ts`) to separate export retime/fps decisions from UI slider state.
- Policy rule implemented: speed `> 50` selects `fast` strategy; speed `<= 50` selects `density` and increases frame density with fps capped at `90`.
- Returned config now includes typed fields (`fps`, `strategy`, `playbackSpeed`, `frameDensityMultiplier`) so downstream callers can use one source of truth.
- For export stability in GCodeViewer, create a snapshot at click-time containing cloned `commands`, copied `theme/viewOptions`, frozen `playbackSpeed`, and serialized camera transform (position/quaternion/up plus perspective params).
- Avoid passing live refs/state into offline export; use snapshot payload and derive frame rendering exclusively from snapshot data to prevent drift while React state keeps updating.
- Added shared `ExportDataSnapshot` type in `types.ts` to standardize export payload around parser outputs (`commands`, `analysis`, `rawText`).
- Updated `GCodeService.processFileAsync` return type to `Promise<ExportDataSnapshot>` so export consumers use parse result contract directly.
