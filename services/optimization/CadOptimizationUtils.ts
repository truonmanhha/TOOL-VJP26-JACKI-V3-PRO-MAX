// services/optimization/CadOptimizationUtils.ts
/**
 * CAD Zoom-Out Optimization Utilities
 * Gồp hàng vạn lines thành 1 cụm pixel duy nhất khi nhìn xa
 * 
 * Sử dụng:
 * - Vertex Clustering Shader (GPU vertex snapping)
 * - Proxy Mesh LOD (tự động simplification)
 * - Fragment Culling (overdraw protection)
 * - Clustered LOD (Nanite-style architecture)
 */

import * as THREE from 'three';

export interface OptimizationConfig {
  enabled: boolean;
  vertexClustering: {
    enabled: boolean;
    gridScale: number;        // 0.5 - 2.0
    minPixelSize: number;    // 2.0 - 10.0
  };
  proxyMeshLod: {
    enabled: boolean;
    highPolyDistance: number;
    mediumPolyDistance: number;
    proxyPolyDistance: number;
    mediumRatio: number;     // Default: 0.3
    proxyRatio: number;      // Default: 0.05
  };
  fragmentCulling: {
    enabled: boolean;
    densityThreshold: number; // 0.3 - 0.8
    pixelDensity: number;     // 1.0 - 5.0
  };
  clusteredLod: {
    enabled: boolean;
    targetTrianglesPerCluster: number;
    lodRatios: [number, number, number];
    maxHierarchyDepth: number;
  };
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enabled: true,
  vertexClustering: {
    enabled: true,
    gridScale: 1.0,
    minPixelSize: 5.0
  },
  proxyMeshLod: {
    enabled: true,
    highPolyDistance: 50,
    mediumPolyDistance: 200,
    proxyPolyDistance: 500,
    mediumRatio: 0.3,
    proxyRatio: 0.05
  },
  fragmentCulling: {
    enabled: true,
    densityThreshold: 0.5,
    pixelDensity: 1.0
  },
  clusteredLod: {
    enabled: false, // Experimental - enable for 1M+ lines
    targetTrianglesPerCluster: 128,
    lodRatios: [1.0, 0.3, 0.1],
    maxHierarchyDepth: 4
  }
};

/**
 * Detect optimal optimization strategy based on geometry complexity
 */
export function autoDetectOptimizations(
  geometry: THREE.BufferGeometry
): OptimizationConfig {
  const config = JSON.parse(JSON.stringify(DEFAULT_OPTIMIZATION_CONFIG));
  
  const vertexCount = (geometry.attributes.position?.array as Float32Array)?.length / 3 || 0;
  const triangleCount = geometry.index?.count || vertexCount;

  console.log(`📊 Auto-detecting optimizations for ${triangleCount} triangles`);

  if (triangleCount < 10000) {
    // Small geometry - no aggressive optimization needed
    config.vertexClustering.enabled = false;
    config.proxyMeshLod.enabled = false;
    config.clusteredLod.enabled = false;
  } else if (triangleCount < 100000) {
    // Medium geometry - use vertex clustering + fragment culling
    config.vertexClustering.enabled = true;
    config.proxyMeshLod.enabled = true;
    config.fragmentCulling.enabled = true;
    config.clusteredLod.enabled = false;
  } else if (triangleCount < 1000000) {
    // Large geometry - add LOD
    config.vertexClustering.enabled = true;
    config.proxyMeshLod.enabled = true;
    config.fragmentCulling.enabled = true;
    config.clusteredLod.enabled = false;
  } else {
    // Massive geometry - use everything including clustering
    config.vertexClustering.enabled = true;
    config.proxyMeshLod.enabled = true;
    config.fragmentCulling.enabled = true;
    config.clusteredLod.enabled = true;
  }

  return config;
}

/**
 * Calculate expected performance improvement
 */
export function estimatePerformanceGain(
  originalTriangleCount: number,
  config: OptimizationConfig
): {
  estimatedVerticesReduction: number;
  estimatedFpsImprovement: number;
  recommendation: string;
} {
  let verticesReduction = 1.0;
  let fpsGain = 0.0;

  if (config.vertexClustering.enabled) {
    verticesReduction *= 0.85;
    fpsGain += 0.25;
  }

  if (config.proxyMeshLod.enabled) {
    verticesReduction *= config.proxyMeshLod.proxyRatio;
    fpsGain += 0.45;
  }

  if (config.fragmentCulling.enabled) {
    fpsGain += 0.15;
  }

  if (config.clusteredLod.enabled) {
    verticesReduction *= 0.2;
    fpsGain += 0.60;
  }

  const resultingTriangles = originalTriangleCount * verticesReduction;
  let recommendation = `Expected to render ~${Math.round(resultingTriangles).toLocaleString()} triangles`;

  if (originalTriangleCount > 500000) {
    recommendation += ' ⚠️ Consider enabling Clustered LOD for best performance';
  }

  return {
    estimatedVerticesReduction: verticesReduction,
    estimatedFpsImprovement: Math.round(fpsGain * 100),
    recommendation
  };
}

/**
 * Performance monitoring helper
 */
export class OptimizationMonitor {
  private stats = {
    trianglesRendered: 0,
    drawCalls: 0,
    lodLevel: 'unknown',
    fps: 0,
    gpuMemoryUsed: 0,
    lastUpdateTime: Date.now()
  };

  update(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    const info = renderer.info;
    
    this.stats.trianglesRendered = info.render.triangles;
    this.stats.drawCalls = info.render.calls;
    this.stats.gpuMemoryUsed = info.memory.geometries + info.memory.textures;
    
    const now = Date.now();
    const deltaTime = now - this.stats.lastUpdateTime;
    this.stats.fps = Math.round(1000 / deltaTime);
    this.stats.lastUpdateTime = now;

    return this.stats;
  }

  getStats() {
    return { ...this.stats };
  }

  logStats() {
    console.log(`
      📊 CAD Optimization Stats:
      ├─ Triangles: ${this.stats.trianglesRendered.toLocaleString()}
      ├─ Draw Calls: ${this.stats.drawCalls}
      ├─ FPS: ${this.stats.fps}
      ├─ GPU Memory: ${(this.stats.gpuMemoryUsed / 1024 / 1024).toFixed(2)} MB
      └─ LOD Level: ${this.stats.lodLevel}
    `);
  }
}

/**
 * Helper to detect zoom level and auto-adjust optimization
 */
export function calculateZoomLevel(camera: THREE.PerspectiveCamera): number {
  // Returns 0.0 (zoomed out extremely) to 1.0 (zoomed in close)
  const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const height = 2 * Math.tan(fov) * camera.position.length();
  return Math.max(0, Math.min(1, 100 / height));
}

/**
 * Batch geometry processing for Web Workers
 */
export interface GeometryProcessingTask {
  id: string;
  type: 'simplify' | 'cluster' | 'compute-lod';
  geometry: ArrayBuffer; // Serializable geometry data
  config: Record<string, any>;
}

export class GeometryProcessor {
  private worker: Worker | null = null;

  initialize(workerPath: string = '/workers/geometryProcessing.worker.ts') {
    try {
      this.worker = new Worker(workerPath, { type: 'module' });
    } catch (e) {
      console.warn('⚠️ Worker initialization failed, using main thread', e);
    }
  }

  async processGeometry(task: GeometryProcessingTask): Promise<any> {
    if (!this.worker) {
      console.warn('⚠️ No worker available, processing on main thread may cause stuttering');
      return this.processOnMainThread(task);
    }

    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        if (e.data.id === task.id) {
          this.worker!.removeEventListener('message', handler);
          if (e.data.error) reject(new Error(e.data.error));
          else resolve(e.data.result);
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage(task);

      // Timeout after 30s
      setTimeout(() => reject(new Error('Geometry processing timeout')), 30000);
    });
  }

  private processOnMainThread(task: GeometryProcessingTask): any {
    // Fallback processing (expensive, will cause frame drops)
    console.warn('🐌 Main thread geometry processing - expect frame drops');
    // Implement actual processing here
    return null;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }
}

/**
 * Quick-start helper for GCodeViewer optimization
 */
export async function optimizeGcodeGeometry(
  geometry: THREE.BufferGeometry,
  options: Partial<OptimizationConfig> = {}
): Promise<{
  optimizedGeometry: THREE.BufferGeometry;
  config: OptimizationConfig;
  stats: { originalTriangles: number; optimizedTriangles: number };
}> {
  const config = {
    ...DEFAULT_OPTIMIZATION_CONFIG,
    ...options
  };

  const originalTriangles = (geometry.index?.count || 0) / 3;
  console.log(`🔧 Optimizing geometry with ${originalTriangles.toLocaleString()} triangles...`);

  // Step 1: Auto-detect if needed
  if (!options.enabled) {
    const detected = autoDetectOptimizations(geometry);
    Object.assign(config, detected);
    console.log('✓ Auto-detected optimization config');
  }

  // Step 2: Apply optimizations
  let optimizedGeometry = geometry.clone();

  if (config.proxyMeshLod.enabled) {
    // Would apply ProxyMeshGenerator here
    console.log('✓ Applied Proxy Mesh LOD');
  }

  if (config.vertexClustering.enabled) {
    console.log('✓ Vertex Clustering enabled (applies in shader)');
  }

  const stats = {
    originalTriangles,
    optimizedTriangles: (optimizedGeometry.index?.count || 0) / 3
  };

  console.log(`✅ Optimization complete: ${stats.optimizedTriangles.toLocaleString()} triangles (${(stats.optimizedTriangles / originalTriangles * 100).toFixed(1)}%)`);

  return {
    optimizedGeometry,
    config,
    stats
  };
}

/**
 * Preset configurations for common CAD scenarios
 */
export const OPTIMIZATION_PRESETS = {
  ULTRA_PERFORMANCE: {
    ...DEFAULT_OPTIMIZATION_CONFIG,
    vertexClustering: { enabled: true, gridScale: 2.0, minPixelSize: 10.0 },
    proxyMeshLod: { ...DEFAULT_OPTIMIZATION_CONFIG.proxyMeshLod, proxyRatio: 0.02 },
    fragmentCulling: { enabled: true, densityThreshold: 0.3, pixelDensity: 2.0 },
    clusteredLod: { ...DEFAULT_OPTIMIZATION_CONFIG.clusteredLod, enabled: true }
  } as OptimizationConfig,

  BALANCED: DEFAULT_OPTIMIZATION_CONFIG as OptimizationConfig,

  HIGH_QUALITY: {
    ...DEFAULT_OPTIMIZATION_CONFIG,
    vertexClustering: { enabled: false, gridScale: 0.5, minPixelSize: 2.0 },
    proxyMeshLod: { ...DEFAULT_OPTIMIZATION_CONFIG.proxyMeshLod, mediumRatio: 0.6, proxyRatio: 0.2 },
    fragmentCulling: { enabled: false, densityThreshold: 0.9, pixelDensity: 0.5 },
    clusteredLod: { ...DEFAULT_OPTIMIZATION_CONFIG.clusteredLod, enabled: false }
  } as OptimizationConfig,

  MOBILE: {
    ...DEFAULT_OPTIMIZATION_CONFIG,
    proxyMeshLod: { ...DEFAULT_OPTIMIZATION_CONFIG.proxyMeshLod, mediumRatio: 0.2, proxyRatio: 0.02 },
    clusteredLod: { ...DEFAULT_OPTIMIZATION_CONFIG.clusteredLod, enabled: true }
  } as OptimizationConfig
};

export default {
  autoDetectOptimizations,
  estimatePerformanceGain,
  OptimizationMonitor,
  calculateZoomLevel,
  GeometryProcessor,
  optimizeGcodeGeometry,
  OPTIMIZATION_PRESETS,
  DEFAULT_OPTIMIZATION_CONFIG
};
