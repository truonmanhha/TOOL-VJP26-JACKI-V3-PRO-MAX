
import { GCodeCommand, GCodeAnalysisReport } from '../types';

export class GCodeService {
  private worker: Worker | null = null;

  private getWorkerCode(): string {
    return `
      const _self = self;
      _self.onmessage = async (e) => {
        const { file, fileHandle } = e.data;
        try {
          let stream;
          let totalSize = 0;
          if (fileHandle && fileHandle.getFile) {
            const f = await fileHandle.getFile();
            stream = f.stream();
            totalSize = f.size;
          } else if (file instanceof File) {
            stream = file.stream();
            totalSize = file.size;
          } else {
            throw new Error("Nguồn tệp không hợp lệ");
          }
          const reader = stream.getReader();
          const decoder = new TextDecoder('utf-8');
          let processedBytes = 0;
          let leftover = '';
          let fullContent = '';
          const commands = [];
          let currentX = 0, currentY = 0, currentZ = 0;
          let activeF = 0, activeS = 0;
          let lastType = 'OTHER';
          let lineCount = 0;

          const parseChunk = (text, cmds, isFinal) => {
            // Use regex to split by newline to be safe against literal string issues
            const lines = text.split(/\\r?\\n/);
            for (let i = 0; i < lines.length; i++) {
              const lineStr = lines[i].trim();
              if (!lineStr) continue;
              lineCount++;
              const trimmed = lineStr.toUpperCase();
              if (trimmed.startsWith('(') || trimmed.startsWith(';')) {
                cmds.push({ line: lineCount, type: 'OTHER', x: currentX, y: currentY, z: currentZ, f: activeF, s: activeS, code: lineStr });
                continue;
              }
              // Regex literals in string need double escaping for backslashes if used
              const xMatch = trimmed.match(/X([-+]?[0-9]*\\.?[0-9]+)/);
              const yMatch = trimmed.match(/Y([-+]?[0-9]*\\.?[0-9]+)/);
              const zMatch = trimmed.match(/Z([-+]?[0-9]*\\.?[0-9]+)/);
              const fMatch = trimmed.match(/F([-+]?[0-9]*\\.?[0-9]+)/);
              const sMatch = trimmed.match(/S([-+]?[0-9]*\\.?[0-9]+)/);
              if (fMatch) activeF = parseFloat(fMatch[1]);
              if (sMatch) activeS = parseFloat(sMatch[1]);
              let type = 'OTHER';
              const gTokens = trimmed.match(/G(\\d+)/g);
              if (gTokens) {
                for (const token of gTokens) {
                  const val = parseInt(token.substring(1), 10);
                  if (val === 0) type = 'G0';
                  else if (val === 1) type = 'G1';
                  else if (val === 2) type = 'G2';
                  else if (val === 3) type = 'G3';
                }
              }
              if (type === 'OTHER' && (xMatch || yMatch || zMatch)) {
                type = (lastType === 'G0' || lastType === 'G1' || lastType === 'G2' || lastType === 'G3') ? lastType : 'G1';
              }
              if (['G0', 'G1', 'G2', 'G3'].includes(type)) {
                const nextX = xMatch ? parseFloat(xMatch[1]) : currentX;
                const nextY = yMatch ? parseFloat(yMatch[1]) : currentY;
                const nextZ = zMatch ? parseFloat(zMatch[1]) : currentZ;
                const iVal = iMatch ? parseFloat(iMatch[1]) : 0;
                const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
        const rVal = rMatch ? parseFloat(rMatch[1]) : undefined;
                const rVal = rMatch ? parseFloat(rMatch[1]) : undefined;
                cmds.push({ line: lineCount, type, x: nextX, y: nextY, z: nextZ, i: iVal, j: jVal, r: rVal, f: activeF, s: activeS, code: lineStr });
                currentX = nextX; currentY = nextY; currentZ = nextZ;
                lastType = type;
              } else {
                cmds.push({ line: lineCount, type: 'OTHER', x: currentX, y: currentY, z: currentZ, f: activeF, s: activeS, code: lineStr });
              }
            }
          };

          const analyze = (cmds) => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
            let toolChanges = 0, totalSeconds = 0, currentFeed = 1000, maxFeed = 0, feedSum = 0, feedCount = 0, maxSpindle = 0;
            let totalCutDistance = 0, totalRapidDistance = 0;
            const collisionWarnings = [];
            const RAPID_FEED = 8000, TOOL_CHANGE_TIME = 15, ACCEL_PENALTY = 0.05;
            cmds.forEach((cmd, i) => {
              if (cmd.type !== 'OTHER') {
                if (cmd.x < minX) minX = cmd.x; if (cmd.x > maxX) maxX = cmd.x;
                if (cmd.y < minY) minY = cmd.y; if (cmd.y > maxY) maxY = cmd.y;
                if (cmd.z < minZ) minZ = cmd.z; if (cmd.z > maxZ) maxZ = cmd.z;
              }
              if (cmd.f && cmd.f > 0) { currentFeed = cmd.f; if (cmd.f > maxFeed) maxFeed = cmd.f; feedSum += cmd.f; feedCount++; }
              if (cmd.s && cmd.s > 0) { if (cmd.s > maxSpindle) maxSpindle = cmd.s; }
              if (i > 0) {
                const prev = cmds[i - 1];
                if (cmd.type !== 'OTHER') {
                  const dist = Math.sqrt(Math.pow(cmd.x - prev.x, 2) + Math.pow(cmd.y - prev.y, 2) + Math.pow(cmd.z - prev.z, 2));
                  if (cmd.type === 'G0') {
                    totalRapidDistance += dist;
                    // Fix template string interpolation for worker
                    if (cmd.z < -0.1 && prev.z < -0.1 && collisionWarnings.length < 5) {
                        const msg = "Dòng " + cmd.line + ": Chạy G0 dưới mặt phôi!";
                        collisionWarnings.push(msg);
                    }
                  } else totalCutDistance += dist;
                  const effectiveFeed = cmd.type === 'G0' ? RAPID_FEED : (cmd.f || currentFeed || 1000);
                  totalSeconds += ((dist / effectiveFeed) * 60) * (1 + ACCEL_PENALTY);
                }
              }
              if (cmd.code.includes('M6') || cmd.code.includes('T')) { toolChanges++; totalSeconds += TOOL_CHANGE_TIME; }
              if (cmd.code.includes('M3') || cmd.code.includes('M4')) totalSeconds += 3;
            });
            if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; minZ = 0; maxZ = 0; }
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            
            const timeStr = (hours > 0 ? hours + 'h ' : '') + minutes + 'm ' + seconds + 's';
            
            return {
              totalTime: timeStr,
              totalSeconds, minX, maxX, minY, maxY, minZ, maxZ, toolChanges, totalCutDistance, totalRapidDistance,
              avgFeed: feedCount > 0 ? feedSum / feedCount : 0, maxFeed, maxSpindle, collisionWarnings
            };
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) { if (leftover) parseChunk(leftover, commands, true); break; }
            processedBytes += value.byteLength;
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            const fullText = leftover + chunk;
            const lastNewline = fullText.lastIndexOf('\\n');
            if (lastNewline !== -1) {
              parseChunk(fullText.substring(0, lastNewline), commands, false);
              leftover = fullText.substring(lastNewline + 1);
            } else leftover = fullText;
            _self.postMessage({ type: 'progress', progress: (processedBytes / totalSize) * 100 });
          }
          _self.postMessage({ type: 'complete', commands, analysis: analyze(commands), content: fullContent });
        } catch (error) {
          _self.postMessage({ type: 'error', error: error.message });
        }
      };
    `;
  }

  public parse(gcode: string): GCodeCommand[] {
    const lines = gcode.split('\n');
    const commands: GCodeCommand[] = [];
    let currentX = 0, currentY = 0, currentZ = 0;
    let lastType: 'G0' | 'G1' | 'G2' | 'G3' | 'OTHER' = 'OTHER';
    let activeF = 0, activeS = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim().toUpperCase();
      if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith(';')) return;
      const xMatch = trimmed.match(/X([-+]?[0-9]*\.?[0-9]+)/);
      const yMatch = trimmed.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
      const zMatch = trimmed.match(/Z([-+]?[0-9]*\.?[0-9]+)/);
      const iMatch = trimmed.match(/I([-+]?[0-9]*\.?[0-9]+)/);
      const jMatch = trimmed.match(/J([-+]?[0-9]*\.?[0-9]+)/);
      const fMatch = trimmed.match(/F([-+]?[0-9]*\.?[0-9]+)/);
      const sMatch = trimmed.match(/S([-+]?[0-9]*\.?[0-9]+)/);
      if (fMatch) activeF = parseFloat(fMatch[1]);
      if (sMatch) activeS = parseFloat(sMatch[1]);

      let type: 'G0' | 'G1' | 'G2' | 'G3' | 'OTHER' = 'OTHER';
      const gTokens = trimmed.match(/G(\d+)/g);
      if (gTokens) {
        for (const token of gTokens) {
          const val = parseInt(token.substring(1), 10);
          if (val === 0) type = 'G0';
          else if (val === 1) type = 'G1';
          else if (val === 2) type = 'G2';
          else if (val === 3) type = 'G3';
        }
      }
      if (type === 'OTHER' && (xMatch || yMatch || zMatch)) {
        type = (lastType === 'G0' || lastType === 'G1' || lastType === 'G2' || lastType === 'G3') ? lastType : 'G1'; 
      }
      if (['G0', 'G1', 'G2', 'G3'].includes(type)) {
        const nextX = xMatch ? parseFloat(xMatch[1]) : currentX;
        const nextY = yMatch ? parseFloat(yMatch[1]) : currentY;
        const nextZ = zMatch ? parseFloat(zMatch[1]) : currentZ;
                const iVal = iMatch ? parseFloat(iMatch[1]) : 0;
                const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
        const rVal = rMatch ? parseFloat(rMatch[1]) : undefined;
                const rVal = rMatch ? parseFloat(rMatch[1]) : undefined;
        commands.push({ line: index + 1, type: type as any, x: nextX, y: nextY, z: nextZ, i: iVal, j: jVal, r: rVal, f: activeF, s: activeS, code: line });
        currentX = nextX; currentY = nextY; currentZ = nextZ; lastType = type;
      } else {
        commands.push({ line: index + 1, type: 'OTHER', x: currentX, y: currentY, z: currentZ, code: line, f: activeF, s: activeS });
      }
    });
    return commands;
  }

  public processFileAsync(
      file: File | any,
      onProgress: (percent: number) => void
  ): Promise<{ commands: GCodeCommand[], analysis: GCodeAnalysisReport, rawText: string }> {
      return new Promise((resolve, reject) => {
          if (this.worker) this.worker.terminate();

          try {
            const blob = new Blob([this.getWorkerCode()], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
          } catch (e) {
            reject(new Error("Không thể khởi tạo Worker: " + e));
            return;
          }

          this.worker.onmessage = (e) => {
              const { type, progress, commands, analysis, content, error } = e.data;
              if (type === 'progress') onProgress(progress);
              else if (type === 'complete') {
                  resolve({ commands, analysis, rawText: content });
                  this.worker?.terminate();
                  this.worker = null;
              } else if (type === 'error') {
                  reject(new Error(error));
                  this.worker?.terminate();
                  this.worker = null;
              }
          };

          this.worker.onerror = (err) => {
              reject(err);
              this.worker?.terminate();
              this.worker = null;
          };

          const isHandle = file.kind === 'file';
          this.worker.postMessage({ file: isHandle ? null : file, fileHandle: isHandle ? file : null });
      });
  }

  public analyze(commands: GCodeCommand[]): GCodeAnalysisReport {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let toolChanges = 0, totalSeconds = 0, currentFeed = 1000, maxFeed = 0, feedSum = 0, feedCount = 0, maxSpindle = 0;
    let totalCutDistance = 0, totalRapidDistance = 0;
    const collisionWarnings: string[] = [];
    const RAPID_FEED = 8000, TOOL_CHANGE_TIME = 15, ACCEL_PENALTY = 0.05;

    commands.forEach((cmd, i) => {
      if (cmd.type !== 'OTHER') {
        if (cmd.x < minX) minX = cmd.x; if (cmd.x > maxX) maxX = cmd.x;
        if (cmd.y < minY) minY = cmd.y; if (cmd.y > maxY) maxY = cmd.y;
        if (cmd.z < minZ) minZ = cmd.z; if (cmd.z > maxZ) maxZ = cmd.z;
      }
      if (cmd.f && cmd.f > 0) { currentFeed = cmd.f; if (cmd.f > maxFeed) maxFeed = cmd.f; feedSum += cmd.f; feedCount++; }
      if (cmd.s && cmd.s > 0) { if (cmd.s > maxSpindle) maxSpindle = cmd.s; }
      if (i > 0) {
        const prev = commands[i - 1];
        if (cmd.type !== 'OTHER') {
          const dist = Math.sqrt(Math.pow(cmd.x - prev.x, 2) + Math.pow(cmd.y - prev.y, 2) + Math.pow(cmd.z - prev.z, 2));
          if (cmd.type === 'G0') {
            totalRapidDistance += dist;
            if (cmd.z < -0.1 && prev.z < -0.1 && collisionWarnings.length < 5) collisionWarnings.push(`Dòng ${cmd.line}: G0 dưới phôi!`);
          } else totalCutDistance += dist;
          const effectiveFeed = cmd.type === 'G0' ? RAPID_FEED : (cmd.f || currentFeed || 1000);
          totalSeconds += ((dist / effectiveFeed) * 60) * (1 + ACCEL_PENALTY);
        }
      }
      if (cmd.code.includes('M6') || cmd.code.includes('T')) { toolChanges++; totalSeconds += TOOL_CHANGE_TIME; }
      if (cmd.code.includes('M3') || cmd.code.includes('M4')) totalSeconds += 3;
    });
    if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; minZ = 0; maxZ = 0; }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return {
      totalTime: `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`,
      totalSeconds, minX, maxX, minY, maxY, minZ, maxZ, toolChanges, totalCutDistance, totalRapidDistance,
      avgFeed: feedCount > 0 ? feedSum / feedCount : 0, maxFeed, maxSpindle, collisionWarnings
    };
  }
}
