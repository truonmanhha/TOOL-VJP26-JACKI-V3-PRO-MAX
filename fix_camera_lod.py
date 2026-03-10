import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# To do LOD (Level of Detail) correctly: when camera is very far, we can skip rendering vertices that are too close to each other.
# We will check the camera distance to the bounding box or origin, and drop vertices that don't add visual value

old_loop = """          for (let i = 0; i < snapshotCommands.length - 1; i++) {
            const c1 = snapshotCommands[i];
            const c2 = snapshotCommands[i + 1];
            commandToVertexIndex[i] = currentVertCount;

            if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;

            const isZeroLen =
              Math.abs(c1.x - c2.x) < 0.0001 &&
              Math.abs(c1.y - c2.y) < 0.0001 &&
              Math.abs(c1.z - c2.z) < 0.0001;
            if (isZeroLen) continue;

            const isRapid = c2.type === 'G0';
            const isCut = c2.type === 'G1' || c2.type === 'G2' || c2.type === 'G3';
            if ((isRapid && !safeSnapshot.viewOptions.showRapid) || (isCut && !safeSnapshot.viewOptions.showCutting)) continue;

            positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
            currentVertCount += 2;
          }"""

new_loop = """          // LOD calculation based on camera distance
          const camZ = safeSnapshot.camera ? Math.abs(safeSnapshot.camera.position.z) : 1000;
          // If Z is huge (e.g. > 2000), we drop tiny segments to save GPU. 
          // Scale from 100% detail at close range to 70% detail at extreme range by culling micro-segments.
          const isFar = camZ > 1000;
          const minRenderDistSq = isFar ? Math.min((camZ / 10000) * 0.5, 2.0) : 0.0001; // Cull segments shorter than this threshold when zoomed out

          for (let i = 0; i < snapshotCommands.length - 1; i++) {
            const c1 = snapshotCommands[i];
            const c2 = snapshotCommands[i + 1];
            commandToVertexIndex[i] = currentVertCount;

            if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;

            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dz = c2.z - c1.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            
            // Dynamic LOD: skip very tiny lines when zoomed way out
            if (distSq < minRenderDistSq) continue;

            const isRapid = c2.type === 'G0';
            const isCut = c2.type === 'G1' || c2.type === 'G2' || c2.type === 'G3';
            if ((isRapid && !safeSnapshot.viewOptions.showRapid) || (isCut && !safeSnapshot.viewOptions.showCutting)) continue;

            positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
            currentVertCount += 2;
          }"""

content = content.replace(old_loop, new_loop)

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)
