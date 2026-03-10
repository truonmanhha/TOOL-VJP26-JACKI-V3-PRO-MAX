import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make the export rendering canvas look exactly like the main canvas SceneContent
# 1. Update line materials to match SceneContent styles
# 2. Add grid helper
# 3. Enhance lighting to match main canvas

old_look = """          const ghostLineMat = new THREE.LineBasicMaterial({ color: safeSnapshot.theme.g1, opacity: 0.18, transparent: true, depthWrite: false });
          const activeLineMat = new THREE.LineBasicMaterial({ color: safeSnapshot.theme.g1, opacity: 1, transparent: false });
          const ghostLine = new THREE.LineSegments(ghostGeo, ghostLineMat);
          const activeLine = new THREE.LineSegments(activeGeo, activeLineMat);
          scene.add(ghostLine, activeLine);

          const toolHeadGeo = new THREE.SphereGeometry(2.5, 20, 20);
          const toolMat = new THREE.MeshStandardMaterial({ color: safeSnapshot.theme.text, emissive: safeSnapshot.theme.text, emissiveIntensity: 0.2 });
          const toolHead = new THREE.Mesh(toolHeadGeo, toolMat);
          scene.add(toolHead);

          const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
          const pointLight = new THREE.PointLight('#ffffff', 1);
          pointLight.position.set(100, 100, 120);
          const axesHelper = new THREE.AxesHelper(100);
          scene.add(ambientLight, pointLight, axesHelper);"""

new_look = """          const ghostLineMat = new THREE.LineBasicMaterial({ color: safeSnapshot.theme.g1, opacity: 0.2, transparent: true, depthWrite: false });
          const activeLineMat = new THREE.LineBasicMaterial({ color: safeSnapshot.theme.g1, opacity: 1.0, transparent: false, linewidth: 2 });
          const ghostLine = new THREE.LineSegments(ghostGeo, ghostLineMat);
          const activeLine = new THREE.LineSegments(activeGeo, activeLineMat);
          scene.add(ghostLine, activeLine);

          // Render toolhead exactly like main canvas (cylinder/cone style)
          const toolHeadGroup = new THREE.Group();
          const spindleGeo = new THREE.CylinderGeometry(15, 15, 40, 16);
          const spindleMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 });
          const spindle = new THREE.Mesh(spindleGeo, spindleMat);
          spindle.position.z = 35;
          spindle.rotation.x = Math.PI / 2;
          
          const bitGeo = new THREE.CylinderGeometry(3, 0.5, 15, 16);
          const bitMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.1 });
          const bit = new THREE.Mesh(bitGeo, bitMat);
          bit.position.z = 7.5;
          bit.rotation.x = Math.PI / 2;
          
          toolHeadGroup.add(spindle, bit);
          scene.add(toolHeadGroup);

          // Lighting matched to main canvas
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
          const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
          directionalLight.position.set(50, 50, 100);
          
          // Grid helper matched to main canvas
          const gridHelper = new THREE.GridHelper(1000, 20, safeSnapshot.theme.grid, safeSnapshot.theme.grid);
          gridHelper.rotation.x = Math.PI / 2;
          gridHelper.material.opacity = 0.2;
          gridHelper.material.transparent = true;
          
          const axesHelper = new THREE.AxesHelper(100);
          scene.add(ambientLight, directionalLight, gridHelper, axesHelper);"""

# Apply the change
content = content.replace(old_look, new_look)

# Also fix the toolHead reference in the renderFrame loop
content = content.replace("toolHead.position.copy(currentPos);", "toolHeadGroup.position.copy(currentPos);")

# And cleanup
content = content.replace("toolHeadGeo.dispose();\n              toolMat.dispose();", "spindleGeo.dispose(); spindleMat.dispose(); bitGeo.dispose(); bitMat.dispose();")

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)

