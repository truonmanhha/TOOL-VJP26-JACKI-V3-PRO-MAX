
- No blocking issues in this task. Existing repository already had unrelated modified files; task changes were limited to policy extraction and policy consumption in benchmark.
- Verification note: `npx tsc --noEmit` fails due to large pre-existing repo errors (R3F JSX typings and unrelated modules), so full-project compile is currently red independent of this snapshot-export change.
- Verification: targeted type-check for changed files passed (`npx tsc --noEmit types.ts services/gcodeService.ts`). Full-project `npx tsc --noEmit` remains red due to unrelated pre-existing errors across many modules.
