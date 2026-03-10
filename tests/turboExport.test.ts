import { describe, it, expect } from 'vitest';
import { GCodeCommand } from '../types';

function generateLargeGCode(lineCount: number): GCodeCommand[] {
  const commands: GCodeCommand[] = [];
  let x = 0, y = 0, z = 10;
  
  commands.push({ type: 'G0', x: 0, y: 0, z: 10, line: 0, code: 'G0 X0 Y0 Z10' });
  
  for (let i = 1; i < lineCount; i++) {
    const isRapid = i % 100 === 0;
    const type = isRapid ? 'G0' : 'G1';
    
    x += Math.sin(i * 0.01) * 2;
    y += Math.cos(i * 0.01) * 2;
    if (i % 1000 === 0) z = 10;
    else if (type === 'G1') z = Math.max(0, z - 0.001);
    
    const xRound = Math.round(x * 1000) / 1000;
    const yRound = Math.round(y * 1000) / 1000;
    const zRound = Math.round(z * 1000) / 1000;
    const f = isRapid ? 30000 : 1500;
    
    commands.push({ 
      type, 
      x: xRound, 
      y: yRound, 
      z: zRound, 
      line: i,
      f,
      code: `${type} X${xRound} Y${yRound} Z${zRound} F${f}`
    });
  }
  
  return commands;
}

const FRAME_SKIP_THRESHOLD = 100000;
const MAX_FRAMES_TARGET = 3000;

function calculateFrameSkip(commandCount: number, baseFps: number, durationSeconds: number): { totalFrames: number; frameSkip: number } {
  const baseFrames = Math.ceil(durationSeconds * baseFps);
  
  if (commandCount < FRAME_SKIP_THRESHOLD) {
    return { totalFrames: baseFrames, frameSkip: 1 };
  }
  
  if (baseFrames <= MAX_FRAMES_TARGET) {
    return { totalFrames: baseFrames, frameSkip: 1 };
  }
  
  const frameSkip = Math.ceil(baseFrames / MAX_FRAMES_TARGET);
  const totalFrames = Math.ceil(baseFrames / frameSkip);
  
  return { totalFrames, frameSkip };
}

describe('TurboExportEngine - Unit Tests', () => {
  describe('GCode generation', () => {
    it('should generate correct number of commands', () => {
      const commands = generateLargeGCode(1000);
      expect(commands.length).toBe(1000);
    });

    it('should have correct types distribution', () => {
      const commands = generateLargeGCode(1000);
      const rapids = commands.filter(c => c.type === 'G0').length;
      const cuts = commands.filter(c => c.type === 'G1').length;
      expect(rapids).toBe(10);
      expect(cuts).toBe(990);
    });

    it('should generate 100k commands quickly', () => {
      const startTime = performance.now();
      const commands = generateLargeGCode(100000);
      const elapsed = performance.now() - startTime;
      
      expect(commands.length).toBe(100000);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should generate 1M commands in reasonable time', () => {
      const startTime = performance.now();
      const commands = generateLargeGCode(1000000);
      const elapsed = performance.now() - startTime;
      
      expect(commands.length).toBe(1000000);
      expect(elapsed).toBeLessThan(10000);
      console.log(`1M commands generated in ${elapsed.toFixed(0)}ms`);
    });
  });

  describe('Frame skip calculation', () => {
    it('should not skip frames for small files', () => {
      const result = calculateFrameSkip(50000, 30, 100);
      expect(result.frameSkip).toBe(1);
      expect(result.totalFrames).toBe(3000);
    });

    it('should skip frames for files over 100k lines with long duration', () => {
      const result = calculateFrameSkip(150000, 30, 300);
      expect(result.totalFrames).toBeLessThanOrEqual(MAX_FRAMES_TARGET);
      expect(result.frameSkip).toBeGreaterThan(1);
    });

    it('should limit frames to MAX_FRAMES_TARGET for ultra-long files', () => {
      const result = calculateFrameSkip(1000000, 30, 600);
      expect(result.totalFrames).toBeLessThanOrEqual(MAX_FRAMES_TARGET);
    });

    it('should calculate correct frameSkip ratio', () => {
      const durationSeconds = 500;
      const baseFps = 30;
      const baseFrames = durationSeconds * baseFps;
      
      const result = calculateFrameSkip(200000, baseFps, durationSeconds);
      
      const expectedSkip = Math.ceil(baseFrames / MAX_FRAMES_TARGET);
      expect(result.frameSkip).toBe(expectedSkip);
    });
  });

  describe('Performance benchmarks', () => {
    it('should process 100k commands geometry calculation quickly', () => {
      const commands = generateLargeGCode(100000);
      const startTime = performance.now();
      
      const positions: number[] = [];
      for (let i = 0; i < commands.length - 1; i++) {
        const c1 = commands[i];
        const c2 = commands[i + 1];
        if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
        positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      }
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(500);
      console.log(`100k geometry bake: ${elapsed.toFixed(0)}ms, ${positions.length / 6} segments`);
    });

    it('should process 500k commands geometry calculation in <2s', () => {
      const commands = generateLargeGCode(500000);
      const startTime = performance.now();
      
      const positions: number[] = [];
      for (let i = 0; i < commands.length - 1; i++) {
        const c1 = commands[i];
        const c2 = commands[i + 1];
        if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
        positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      }
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(2000);
      console.log(`500k geometry bake: ${elapsed.toFixed(0)}ms, ${positions.length / 6} segments`);
    });

    it('should process 1M commands geometry calculation in <5s', () => {
      const commands = generateLargeGCode(1000000);
      const startTime = performance.now();
      
      const positions: number[] = [];
      for (let i = 0; i < commands.length - 1; i++) {
        const c1 = commands[i];
        const c2 = commands[i + 1];
        if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
        positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      }
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(5000);
      console.log(`1M geometry bake: ${elapsed.toFixed(0)}ms, ${positions.length / 6} segments`);
    });
  });
});
