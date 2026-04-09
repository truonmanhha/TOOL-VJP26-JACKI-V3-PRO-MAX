import { describe, it, expect } from 'vitest';
import { getExportConfig } from '../services/exportPolicy';
import { getExportSnapshot } from '../services/gcodeService';

describe('Export Policy', () => {
  it('should return fast path for speed > 50', () => {
    const policy = getExportConfig(100);
    expect(policy.strategy).toBe('fast');
    expect(policy.fps).toBeLessThanOrEqual(50);
  });

  it('should return low speed path with density boost for speed <= 50', () => {
    const policy = getExportConfig(25);
    expect(policy.strategy).toBe('density');
    expect(policy.fps).toBeGreaterThan(15);
    expect(policy.fps).toBeLessThanOrEqual(50);
  });

  it('should cap fps at 50', () => {
    const policy = getExportConfig(1);
    expect(policy.fps).toBeLessThanOrEqual(50);
  });
});

describe('Export Snapshot', () => {
  it('should take immutable snapshot', () => {
    const commands = [{ line: 1, type: 'G0', x: 0, y: 0, z: 0, code: 'G0 X0' }];
    const analysis = { totalTime: '0s', totalSeconds: 0 } as any;
    const rawText = 'G0 X0';
    
    const snapshot = getExportSnapshot(commands as any, analysis, rawText);
    
    expect(snapshot.commands).not.toBe(commands); // Reference changed
    expect(snapshot.commands).toEqual(commands); // Content identical
    expect(snapshot.analysis).not.toBe(analysis);
    expect(snapshot.rawText).toBe(rawText);
  });
});
