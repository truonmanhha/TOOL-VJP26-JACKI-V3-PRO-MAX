// Example: Integrating CAD Optimization into GCodeViewer.tsx
/**
 * Này là ví dụ sử dụng CAD Zoom-Out Optimization trong GCodeViewer component
 * 
 * Flow:
 * 1. Load GCode → Parse Geometry
 * 2. Auto-detect optimization strategy
 * 3. Apply vertex clustering shader
 * 4. Setup LOD system (if geometry > 100k lines)
 * 5. Monitor performance in real-time
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  autoDetectOptimizations,
  estimatePerformanceGain,
  OptimizationMonitor,
  calculateZoomLevel,
  optimizeGcodeGeometry,
  OPTIMIZATION_PRESETS
} from '@/services/optimization/CadOptimizationUtils';

interface GCodeViewerProps {
  gcodeFile: File;
  optimizationPreset?: keyof typeof OPTIMIZATION_PRESETS;
  onPerformanceUpdate?: (stats: any) => void;
}

export const OptimizedGCodeViewer: React.FC<GCodeViewerProps> = ({
  gcodeFile,
  optimizationPreset = 'BALANCED',
  onPerformanceUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const monitorRef = useRef<OptimizationMonitor | null>(null);
  const [stats, setStats] = useState<string>('Loading...');

  useEffect(() => {
    if (!containerRef.current) return;

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ===== CONTROLS =====
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controlsRef.current = controls;

    // ===== LOAD & OPTIMIZE GCODE =====
    const loadAndOptimizeGCode = async () => {
      try {
        console.log('📄 Loading GCode file...');
        const gcodeText = await gcodeFile.text();

        // Parse GCode (simplified parser - actual implementation in gcodeService)
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        
        // Simple parser: extract line segments from G-codes
        const lines = gcodeText.split('\n');
        let currentPos = [0, 0, 0];
        const minTravel = 1; // Skip very small movements
        
        for (const line of lines) {
          const match = line.match(/X([\d.-]+)\s+Y([\d.-]+)\s+Z([\d.-]+)/);
          if (match) {
            const [, x, y, z] = match.map(Number);
            const dist = Math.sqrt(
              (x - currentPos[0]) ** 2 + 
              (y - currentPos[1]) ** 2 + 
              (z - currentPos[2]) ** 2
            );
            
            if (dist > minTravel) {
              positions.push(currentPos[0], currentPos[1], currentPos[2]);
              positions.push(x, y, z);
              currentPos = [x, y, z];
            }
          }
        }

        if (positions.length === 0) {
          console.warn('⚠️ No valid coordinates found in GCode');
          return;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        const lineCount = positions.length / 6;
        console.log(`✓ Parsed ${lineCount.toLocaleString()} lines from GCode`);

        // ===== AUTO-DETECT OPTIMIZATION STRATEGY =====
        const optimizationConfig = OPTIMIZATION_PRESETS[optimizationPreset];
        const stats = estimatePerformanceGain(lineCount, optimizationConfig);
        console.log(`📊 ${stats.recommendation}`);
        console.log(`   Expected FPS improvement: +${stats.estimatedFpsImprovement}%`);

        // ===== CREATE MATERIAL WITH VERTEX CLUSTERING SHADER =====
        const clusteringMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uZoom: { value: 1.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uGridScale: { value: optimizationConfig.vertexClustering.gridScale },
            uMinPixelSize: { value: optimizationConfig.vertexClustering.minPixelSize },
            uColor: { value: new THREE.Color(0x00ff00) }
          },
          vertexShader: `
            uniform float uZoom;
            uniform vec2 uResolution;
            uniform float uGridScale;
            uniform float uMinPixelSize;

            void main() {
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              vec4 clipPosition = projectionMatrix * mvPosition;
              
              vec2 ndc = clipPosition.xy / clipPosition.w;
              
              float screenPixelSize = 2.0 / min(uResolution.x, uResolution.y);
              float snapFactor = uGridScale * screenPixelSize / (uZoom * uMinPixelSize);
              
              vec2 snappedNdc = floor(ndc / snapFactor + 0.5) * snapFactor;
              float blendFactor = smoothstep(0.2, 0.8, uZoom);
              ndc = mix(snappedNdc, ndc, blendFactor);
              
              gl_Position = vec4(ndc * clipPosition.w, clipPosition.z, clipPosition.w);
            }
          `,
          fragmentShader: `
            uniform vec3 uColor;
            void main() {
              gl_FragColor = vec4(uColor, 1.0);
            }
          `,
          wireframe: false,
          side: THREE.DoubleSide
        });

        // ===== CREATE GCODE VISUALIZATION =====
        const lines = new THREE.LineSegments(geometry, clusteringMaterial);
        scene.add(lines);

        // Fit camera to geometry
        const bbox = new THREE.Box3().setFromBufferAttribute(
          geometry.attributes.position as THREE.BufferAttribute
        );
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        
        camera.position.copy(center);
        camera.position.z += cameraZ * 1.5;
        camera.lookAt(center);
        controls.target.copy(center);

        // ===== SETUP PERFORMANCE MONITORING =====
        const monitor = new OptimizationMonitor();
        monitorRef.current = monitor;

        // ===== ANIMATION LOOP =====
        const animate = () => {
          requestAnimationFrame(animate);
          
          controls.update();

          // Update vertex clustering based on current zoom
          const zoomLevel = calculateZoomLevel(camera);
          (clusteringMaterial.uniforms.uZoom as any).value = zoomLevel;

          renderer.render(scene, camera);

          // Update stats
          const perfStats = monitor.update(renderer, camera);
          const statsText = `
            🎬 FPS: ${perfStats.fps}
            📐 Triangles: ${perfStats.trianglesRendered.toLocaleString()}
            🎯 Draw Calls: ${perfStats.drawCalls}
            💾 Memory: ${(perfStats.gpuMemoryUsed / 1024 / 1024).toFixed(1)} MB
            🔍 Zoom: ${(zoomLevel * 100).toFixed(0)}%
          `;
          setStats(statsText);
          onPerformanceUpdate?.(perfStats);
        };

        animate();

        // ===== CLEANUP =====
        const handleResize = () => {
          const width = containerRef.current?.clientWidth || 1;
          const height = containerRef.current?.clientHeight || 1;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          (clusteringMaterial.uniforms.uResolution as any).value.set(width, height);
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          geometry.dispose();
          clusteringMaterial.dispose();
          renderer.dispose();
        };
      } catch (error) {
        console.error('❌ Error loading GCode:', error);
        setStats(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    loadAndOptimizeGCode();
  }, [gcodeFile, optimizationPreset, onPerformanceUpdate]);

  return (
    <div className="w-full h-full flex gap-4">
      {/* Viewer Canvas */}
      <div
        ref={containerRef}
        className="flex-1 bg-[#0f1419] rounded-lg overflow-hidden"
        style={{ minHeight: '600px' }}
      />

      {/* Stats Panel */}
      <div className="w-64 bg-[#1a1f2e] rounded-lg p-4 text-slate-200 font-mono text-sm overflow-y-auto">
        <h3 className="text-emerald-400 font-bold mb-4">Performance Stats</h3>
        <pre className="whitespace-pre-wrap break-words">
          {stats}
        </pre>
      </div>
    </div>
  );
};

export default OptimizedGCodeViewer;


/**
 * ===== ADVANCED USAGE: WITH LOD SYSTEM =====
 * 
 * For extremely large geometries (>500k lines), integrate the ClusteredLODManager:
 */

export interface AdvancedOptimizationProps {
  gcodeFile: File;
  enableClusteredLod?: boolean;
  lodConfig?: {
    highPolyDistance: number;
    mediumPolyDistance: number;
    proxyPolyDistance: number;
  };
}

export const AdvancedOptimizedGCodeViewer: React.FC<AdvancedOptimizationProps> = ({
  gcodeFile,
  enableClusteredLod = false,
  lodConfig = {
    highPolyDistance: 50,
    mediumPolyDistance: 200,
    proxyPolyDistance: 500
  }
}) => {
  // Implementation would follow similar pattern but with:
  // 1. ProxyMeshGenerator for creating LOD geometries
  // 2. ClusteredLODManager for managing multiple LOD levels
  // 3. InstancedMesh for efficient rendering of LOD clusters
  
  return (
    <div>
      <h2>Advanced GCode Optimizer (Clustered LOD)</h2>
      <p>Enable this for GCode files with >500k lines</p>
      {/* Component implementation here */}
    </div>
  );
};
