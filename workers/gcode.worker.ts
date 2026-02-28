

// G-Code Processing Worker
// Handles streaming parsing to avoid blocking the main thread

interface GCodeCommand {
  line: number;
  type: 'G0' | 'G1' | 'G2' | 'G3' | 'OTHER';
  x: number;
  y: number;
  z: number;
  f?: number;
  s?: number;
  code: string;
}

// Explicitly define self as WorkerGlobalScope to avoid TS errors
const _self: Worker = self as any;

_self.onmessage = async (e: MessageEvent) => {
  const { file, fileHandle } = e.data;

  try {
    let stream: ReadableStream<Uint8Array>;
    let totalSize = 0;

    if (fileHandle && (fileHandle as any).getFile) {
        // FileSystemAccessAPI
        const f = await (fileHandle as any).getFile();
        stream = f.stream();
        totalSize = f.size;
    } else if (file instanceof File) {
        // Standard File API
        stream = file.stream();
        totalSize = file.size;
    } else {
        throw new Error("Invalid file source");
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    
    let processedBytes = 0;
    let leftover = '';
    let fullContent = '';
    const commands: GCodeCommand[] = [];
    
    // Modal state
    let currentX = 0, currentY = 0, currentZ = 0;
    let activeF = 0, activeS = 0;
    let lastType: 'G0' | 'G1' | 'G2' | 'G3' | 'OTHER' = 'OTHER';
    let lineCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (leftover) {
            parseChunk(leftover, commands, true);
        }
        break;
      }

      processedBytes += value.byteLength;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      
      const fullText = leftover + chunk;
      
      const lastNewline = fullText.lastIndexOf('\n');
      
      let linesToProcess = '';
      if (lastNewline !== -1) {
          linesToProcess = fullText.substring(0, lastNewline);
          leftover = fullText.substring(lastNewline + 1);
      } else {
          leftover = fullText;
          continue; 
      }

      parseChunk(linesToProcess, commands, false);

      _self.postMessage({
        type: 'progress',
        progress: (processedBytes / totalSize) * 100
      });
    }

    const analysis = analyzeGCode(commands);

    _self.postMessage({
      type: 'complete',
      commands,
      analysis,
      content: fullContent
    });

    function parseChunk(text: string, cmds: GCodeCommand[], isFinal: boolean) {
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const lineStr = lines[i].trim();
            if (!lineStr) continue;
            
            lineCount++;
            const trimmed = lineStr.toUpperCase();
            
            if (trimmed.startsWith('(') || trimmed.startsWith(';')) {
                cmds.push({
                    line: lineCount, type: 'OTHER', x: currentX, y: currentY, z: currentZ, 
                    f: activeF, s: activeS, code: lineStr
                });
                continue;
            }

            const xMatch = trimmed.match(/X([-+]?[0-9]*\.?[0-9]+)/);
            const yMatch = trimmed.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
            const zMatch = trimmed.match(/Z([-+]?[0-9]*\.?[0-9]+)/);
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

            if (type === 'G0' || type === 'G1' || type === 'G2' || type === 'G3') {
                const nextX = xMatch ? parseFloat(xMatch[1]) : currentX;
                const nextY = yMatch ? parseFloat(yMatch[1]) : currentY;
                const nextZ = zMatch ? parseFloat(zMatch[1]) : currentZ;

                cmds.push({
                    line: lineCount,
                    type,
                    x: nextX, y: nextY, z: nextZ,
                    f: activeF, s: activeS,
                    code: lineStr
                });

                currentX = nextX; currentY = nextY; currentZ = nextZ;
                lastType = type;
            } else {
                cmds.push({
                    line: lineCount, type: 'OTHER',
                    x: currentX, y: currentY, z: currentZ,
                    f: activeF, s: activeS,
                    code: lineStr
                });
            }
        }
    }

  } catch (error: any) {
    _self.postMessage({ type: 'error', error: error.message });
  }
};

function analyzeGCode(commands: GCodeCommand[]) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let toolChanges = 0;
    
    let totalSeconds = 0;
    let currentFeed = 1000; 
    let maxFeed = 0;
    let feedSum = 0;
    let feedCount = 0;
    let maxSpindle = 0;
    
    let totalCutDistance = 0;
    let totalRapidDistance = 0;
    const collisionWarnings: string[] = [];

    const RAPID_FEED = 8000; 
    const TOOL_CHANGE_TIME = 15; 
    const ACCEL_PENALTY = 0.05; 

    commands.forEach((cmd, i) => {
      if (cmd.type !== 'OTHER') {
        if (cmd.x < minX) minX = cmd.x;
        if (cmd.x > maxX) maxX = cmd.x;
        if (cmd.y < minY) minY = cmd.y;
        if (cmd.y > maxY) maxY = cmd.y;
        if (cmd.z < minZ) minZ = cmd.z;
        if (cmd.z > maxZ) maxZ = cmd.z;
      }

      if (cmd.f && cmd.f > 0) {
          currentFeed = cmd.f;
          if (cmd.f > maxFeed) maxFeed = cmd.f;
          feedSum += cmd.f;
          feedCount++;
      }
      if (cmd.s && cmd.s > 0) {
          if (cmd.s > maxSpindle) maxSpindle = cmd.s;
      }

      if (i > 0) {
          const prev = commands[i - 1];
          if (cmd.type !== 'OTHER') {
            const dist = Math.sqrt(Math.pow(cmd.x - prev.x, 2) + Math.pow(cmd.y - prev.y, 2) + Math.pow(cmd.z - prev.z, 2));
            
            if (cmd.type === 'G0') {
                totalRapidDistance += dist;
                if (cmd.z < -0.1 && prev.z < -0.1) {
                    if (collisionWarnings.length < 5) {
                        collisionWarnings.push(`Dòng ${cmd.line}: Chạy G0 (Nhanh) dưới mặt phôi (Z${cmd.z.toFixed(2)})! Nguy hiểm!`);
                    }
                }
            } else {
                totalCutDistance += dist;
            }

            let moveTime = 0;
            if (cmd.type === 'G0') {
                moveTime = (dist / RAPID_FEED) * 60; 
            } else {
                const effectiveFeed = cmd.f || currentFeed || 1000;
                moveTime = (dist / effectiveFeed) * 60; 
            }
            totalSeconds += moveTime * (1 + ACCEL_PENALTY);
          }
      }

      if (cmd.code.includes('M6') || cmd.code.includes('T')) {
          toolChanges++;
          totalSeconds += TOOL_CHANGE_TIME;
      }
      if (cmd.code.includes('M3') || cmd.code.includes('M03') || cmd.code.includes('M4')) {
          totalSeconds += 3; 
      }
    });

    if (minX === Infinity) { minX = 0; maxX = 0; minY = 0; maxY = 0; minZ = 0; maxZ = 0; }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let timeString = '';
    if (hours > 0) timeString += `${hours}h `;
    timeString += `${minutes}m ${seconds}s`;

    return {
      totalTime: timeString,
      totalSeconds,
      minX, maxX, minY, maxY, minZ, maxZ,
      toolChanges,
      totalCutDistance,
      totalRapidDistance,
      avgFeed: feedCount > 0 ? feedSum / feedCount : 0,
      maxFeed,
      maxSpindle,
      collisionWarnings
    };
}

export {};
