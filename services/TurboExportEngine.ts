// ============================================================
// TurboExportEngine v2 - Adaptive Re-time Video Export
// ============================================================
// Render ở tốc độ cao (x100), output đúng fps target
// Visual giống 100% canvas chính (arc interpolation, ghost/active lines)
// ============================================================

import * as THREE from 'three';
import { GCodeCommand } from '@/types';
import { WebMEncoder, WebMEncoderConfig } from './WebMEncoder';
import { MP4Encoder, MP4EncoderConfig } from './MP4Encoder';

// ============ TYPES ============

export type VideoFormat = 'webm' | 'mp4';

export interface CameraSnapshot {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  up: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
}

export interface TurboExportConfig {
  commands: GCodeCommand[];
  speedMultiplier: number;
  targetFps: number;
  width?: number;
  height?: number;
  format?: VideoFormat;
  cameraSnapshot?: CameraSnapshot | null;
  theme: {
    background: string;
    g0: string;
    g1: string;
    arc: string;
    grid: string;
  };
  viewOptions: {
    showRapid: boolean;
    showCutting: boolean;
    highlightArcs: boolean;
  };
  toolConfig?: {
    diameter: number;
    length: number;
    holderDiameter: number;
    holderLength: number;
  };
  onProgress?: (progress: TurboExportProgress) => void;
  encoderConfig?: Partial<WebMEncoderConfig> | Partial<MP4EncoderConfig>;
  previewContainer?: HTMLElement | null;
}

export interface TurboExportProgress {
  phase: 'baking' | 'rendering' | 'encoding' | 'done';
  currentFrame: number;
  totalFrames: number;
  progress: number;
  fps: number;
  estimatedTimeRemaining: number;
  message?: string;
}

interface BakedGeometry {
  positions: Float32Array;
  colors: Float32Array;
  commandToVertexIndex: Int32Array;
  bounds: THREE.Box3;
  totalVertices: number;
}

interface FrameState {
  commandIndex: number;
  vertexIndex: number;
  toolPosition: THREE.Vector3;
  progress: number; // 0-1 within current segment
}

// ============ CONSTANTS ============

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const G0_FEED_RATE = 30000;
const DEFAULT_FEED_RATE = 3000;
const BAKE_CHUNK_SIZE = 10000;
const RENDER_BATCH_SIZE = 30;

// Retime export: render x100 @ 360fps → slow down to user speed @ 90fps
const INTERNAL_RENDER_SPEED = 100;
const INTERNAL_RENDER_FPS = 480;
const OUTPUT_FPS = 120;
const DISCORD_MAX_SIZE = 8 * 1024 * 1024;
const TELEGRAM_MAX_SIZE = 48 * 1024 * 1024;
const DEFAULT_BITRATE_BPS = 2_500_000;
const MIN_BITRATE_BPS = 600_000;

const DEFAULT_TOOL_CONFIG = {
  diameter: 6,
  length: 30,
  holderDiameter: 40,
  holderLength: 50
};

// ============ MAIN ENGINE ============

export class TurboExportEngine {
  private config: Required<Omit<TurboExportConfig, 'onProgress' | 'encoderConfig' | 'previewContainer' | 'format' | 'cameraSnapshot'>> & 
    Pick<TurboExportConfig, 'onProgress' | 'encoderConfig' | 'previewContainer' | 'cameraSnapshot'> &
    { format: VideoFormat };
  
  private bakedGeometry: BakedGeometry | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  // Scene objects
  private ghostLine: THREE.LineSegments | null = null;
  private activeLine: THREE.LineSegments | null = null;
  private toolHead: THREE.Group | null = null;
  private activeGeometry: THREE.BufferGeometry | null = null;

  constructor(config: TurboExportConfig) {
    this.config = {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      toolConfig: DEFAULT_TOOL_CONFIG,
      format: 'webm',
      cameraSnapshot: null,
      ...config,
      theme: {
        arc: config.theme.g1,
        ...config.theme
      }
    };
  }

  // ============ MAIN EXPORT ============

  async export(): Promise<Blob> {
    const startTime = performance.now();
    
    try {
      this.reportProgress('baking', 0, 1, 0, 0, 0, 'Đang xử lý geometry...');
      await this.bakeGeometryWithArcs();
      
      this.setupCanvas();
      this.setupRenderer();
      this.setupScene();
      
      const userSpeed = this.config.speedMultiplier;
      const speedRatio = INTERNAL_RENDER_SPEED / userSpeed;
      
      const renderFps = INTERNAL_RENDER_FPS;
      const rawOutputFps = Math.round(renderFps / speedRatio);
      const outputFps = Math.max(60, rawOutputFps);
      
      const effectiveRenderFps = outputFps * speedRatio;
      const framePlan = this.calculateAdaptiveFramePlan(INTERNAL_RENDER_SPEED, effectiveRenderFps);
      const totalFrames = framePlan.length;
      
      const videoDurationSec = totalFrames / outputFps;
      const targetBitrate = this.calculateOptimalBitrate(videoDurationSec);
      
      console.log(`📊 Retime: render x${INTERNAL_RENDER_SPEED}@${effectiveRenderFps.toFixed(0)}fps → output x${userSpeed}@${outputFps}fps`);
      console.log(`📊 ${totalFrames} frames, ${videoDurationSec.toFixed(1)}s, ${(targetBitrate/1000000).toFixed(1)}Mbps`);
      
      const blob = await this.renderFramesToBlob(framePlan, totalFrames, outputFps, startTime, targetBitrate);
      
      this.reportProgress('done', totalFrames, totalFrames, 1, 0, 0, 'Hoàn thành!');
      
      const totalTime = (performance.now() - startTime) / 1000;
      const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      console.log(`✓ Export: ${this.config.commands.length} cmds → ${totalFrames} frames in ${totalTime.toFixed(1)}s (${fileSizeMB}MB)`);
      
      return blob;
      
    } finally {
      this.dispose();
    }
  }

  private calculateOptimalBitrate(durationSec: number): number {
    const maxSize = this.config.format === 'mp4' ? TELEGRAM_MAX_SIZE : DISCORD_MAX_SIZE;
    const maxBitsAvailable = maxSize * 8 * 0.9;
    const calculatedBitrate = Math.floor(maxBitsAvailable / durationSec);
    return Math.max(MIN_BITRATE_BPS, Math.min(DEFAULT_BITRATE_BPS, calculatedBitrate));
  }

  private async renderFramesToBlob(
    framePlan: FrameState[],
    totalFrames: number,
    outputFps: number,
    startTime: number,
    bitrateOverride?: number
  ): Promise<Blob> {
    // Select encoder based on format: MP4 for Telegram, WebM for Discord
    const encoderConfig = {
      width: this.config.width,
      height: this.config.height,
      frameRate: outputFps,
      bitrate: bitrateOverride || DEFAULT_BITRATE_BPS,
      ...this.config.encoderConfig
    };
    
    const encoder = this.config.format === 'mp4'
      ? new MP4Encoder(encoderConfig)
      : new WebMEncoder(encoderConfig);
    
    let lastProgressTime = startTime;
    let frameCount = 0;
    
    for (let i = 0; i < totalFrames; i++) {
      const frame = framePlan[i];
      
      this.updateSceneForFrame(frame);
      this.renderer!.render(this.scene!, this.camera!);
      
      const timestampMicros = Math.round((i / outputFps) * 1_000_000);
      const durationMicros = Math.round((1 / outputFps) * 1_000_000);
      
      await encoder.addFrame(this.canvas!, timestampMicros, durationMicros);
      frameCount++;
      
      if (i % RENDER_BATCH_SIZE === 0 || i === totalFrames - 1) {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;
        const progress = (i + 1) / totalFrames;
        const remaining = (elapsed / progress) - elapsed;
        const currentFps = frameCount / ((now - lastProgressTime) / 1000);
        
        this.reportProgress('rendering', i + 1, totalFrames, progress, currentFps, remaining);
        await this.yieldToMain();
        
        frameCount = 0;
        lastProgressTime = now;
      }
    }
    
    this.reportProgress('encoding', totalFrames, totalFrames, 0.99, 0, 0, 'Đang encode video...');
    return encoder.finish();
  }

  // ============ GEOMETRY BAKING (với Arc Interpolation) ============

  private async bakeGeometryWithArcs(): Promise<void> {
    const { commands, viewOptions, theme } = this.config;
    
    const positions: number[] = [];
    const colors: number[] = [];
    const commandToVertexIndex = new Int32Array(commands.length);
    const bounds = new THREE.Box3();
    
    const colG0 = new THREE.Color(theme.g0);
    const colG1 = new THREE.Color(theme.g1);
    const colArc = new THREE.Color(theme.arc);
    
    let vertexCount = 0;
    
    for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i];
      const c2 = commands[i + 1];
      
      commandToVertexIndex[i] = vertexCount;
      
      if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
      
      // Skip zero-length moves
      const dx = Math.abs(c1.x - c2.x);
      const dy = Math.abs(c1.y - c2.y);
      const dz = Math.abs(c1.z - c2.z);
      if (dx < 0.001 && dy < 0.001 && dz < 0.001) continue;
      
      // Visibility check
      const isRapid = c2.type === 'G0';
      const isCut = c2.type === 'G1' || c2.type === 'G2' || c2.type === 'G3';
      if (isRapid && !viewOptions.showRapid) continue;
      if (isCut && !viewOptions.showCutting) continue;
      
      // ============ ARC INTERPOLATION (G2/G3) ============
      if ((c2.type === 'G2' || c2.type === 'G3') && 
          (c2.i !== undefined || c2.j !== undefined || c2.r !== undefined)) {
        
        // Calculate arc center
        let cx = c1.x, cy = c1.y;
        
        if (c2.r !== undefined && c2.r !== 0) {
          // R-form: calculate center from radius
          const x1 = c1.x, y1 = c1.y, x2 = c2.x, y2 = c2.y;
          const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
          const r = Math.abs(c2.r);
          
          if (d > 0 && d <= 2*r) {
            const h = Math.sqrt(r**2 - (d/2)**2);
            const mx = (x1+x2)/2, my = (y1+y2)/2;
            const ndx = (y2-y1)/d, ndy = -(x2-x1)/d;
            const isMajor = c2.r < 0;
            let sign = (c2.type === 'G2') ? 1 : -1;
            if (isMajor) sign *= -1;
            cx = mx + sign * h * ndx;
            cy = my + sign * h * ndy;
          } else {
            cx = (x1+x2)/2;
            cy = (y1+y2)/2;
          }
        } else {
          // I,J form: center offset from start
          cx = c1.x + (c2.i || 0);
          cy = c1.y + (c2.j || 0);
        }
        
        const startAngle = Math.atan2(c1.y - cy, c1.x - cx);
        const endAngle = Math.atan2(c2.y - cy, c2.x - cx);
        const radius = Math.sqrt((c1.x - cx)**2 + (c1.y - cy)**2);
        
        let angleDiff = endAngle - startAngle;
        if (c2.type === 'G2') { // Clockwise
          if (angleDiff > 0) angleDiff -= 2 * Math.PI;
        } else { // G3 - Counter-clockwise
          if (angleDiff < 0) angleDiff += 2 * Math.PI;
        }
        
        if (Math.abs(angleDiff) > 0.0001) {
          // Segment count: 16-128 based on arc length
          const segments = Math.max(16, Math.min(128, Math.ceil(Math.abs(angleDiff) / (2 * Math.PI) * 128)));
          
          let prevX = c1.x, prevY = c1.y, prevZ = c1.z;
          const col = viewOptions.highlightArcs ? colArc : colG1;
          
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const angle = startAngle + angleDiff * t;
            
            const currX = cx + radius * Math.cos(angle);
            const currY = cy + radius * Math.sin(angle);
            const currZ = c1.z + (c2.z - c1.z) * t;
            
            positions.push(prevX, prevY, prevZ, currX, currY, currZ);
            colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
            
            bounds.expandByPoint(new THREE.Vector3(prevX, prevY, prevZ));
            bounds.expandByPoint(new THREE.Vector3(currX, currY, currZ));
            
            vertexCount += 2;
            prevX = currX;
            prevY = currY;
            prevZ = currZ;
          }
          continue; // Skip straight line logic
        }
      }
      
      // ============ STRAIGHT LINES (G0/G1) ============
      const col = isRapid ? colG0 : colG1;
      
      positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
      
      bounds.expandByPoint(new THREE.Vector3(c1.x, c1.y, c1.z));
      bounds.expandByPoint(new THREE.Vector3(c2.x, c2.y, c2.z));
      
      vertexCount += 2;
      
      // Yield periodically
      if (i % BAKE_CHUNK_SIZE === 0 && i > 0) {
        this.reportProgress('baking', i, commands.length, i / commands.length * 0.3);
        await this.yieldToMain();
      }
    }
    
    // Final command index
    if (commands.length > 0) {
      commandToVertexIndex[commands.length - 1] = vertexCount;
    }
    
    this.bakedGeometry = {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      commandToVertexIndex,
      bounds,
      totalVertices: vertexCount
    };
    
    console.log(`✓ Baked: ${vertexCount / 2} segments with arc interpolation`);
  }

  // ============ ADAPTIVE FRAME PLAN ============

  private calculateAdaptiveFramePlan(speedMultiplier: number, renderFps: number): FrameState[] {
    const { commands } = this.config;
    
    let totalDurationMs = 0;
    
    for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i];
      const c2 = commands[i + 1];
      
      if (c2.type === 'OTHER') continue;
      
      const dist = Math.sqrt(
        (c2.x - c1.x)**2 + 
        (c2.y - c1.y)**2 + 
        (c2.z - c1.z)**2
      );
      
      let feedRate = DEFAULT_FEED_RATE;
      if (c2.type === 'G0') {
        feedRate = G0_FEED_RATE;
      } else if (c2.f && c2.f > 0) {
        feedRate = c2.f;
      }
      
      const segmentTimeMs = (dist / feedRate) * 60000;
      totalDurationMs += segmentTimeMs;
    }
    
    const videoDurationMs = totalDurationMs / speedMultiplier;
    const videoDurationSec = videoDurationMs / 1000;
    
    const totalFrames = Math.max(30, Math.ceil(videoDurationSec * renderFps));
    
    console.log(`📊 Duration: ${(totalDurationMs/1000).toFixed(1)}s real → ${videoDurationSec.toFixed(1)}s @ x${speedMultiplier}`);
    console.log(`📊 Frames: ${totalFrames} @ ${renderFps}fps`);
    
    const framePlan: FrameState[] = [];
    const msPerFrame = videoDurationMs / totalFrames;
    
    const cumulativeTimes: number[] = [0];
    let cumTime = 0;
    
    for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i];
      const c2 = commands[i + 1];
      
      if (c2.type === 'OTHER') {
        cumulativeTimes.push(cumTime);
        continue;
      }
      
      const dist = Math.sqrt(
        (c2.x - c1.x)**2 + 
        (c2.y - c1.y)**2 + 
        (c2.z - c1.z)**2
      );
      
      let feedRate = DEFAULT_FEED_RATE;
      if (c2.type === 'G0') feedRate = G0_FEED_RATE;
      else if (c2.f && c2.f > 0) feedRate = c2.f;
      
      cumTime += (dist / feedRate) * 60000;
      cumulativeTimes.push(cumTime);
    }
    
    // Generate frames
    for (let f = 0; f < totalFrames; f++) {
      const targetTime = f * msPerFrame * speedMultiplier; // Convert back to real time
      
      // Binary search for command index
      let lo = 0, hi = cumulativeTimes.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if (cumulativeTimes[mid] <= targetTime) lo = mid;
        else hi = mid - 1;
      }
      
      const cmdIndex = Math.min(lo, commands.length - 2);
      const c1 = commands[cmdIndex];
      const c2 = commands[cmdIndex + 1];
      
      // Calculate progress within segment
      const segmentStartTime = cumulativeTimes[cmdIndex];
      const segmentEndTime = cumulativeTimes[cmdIndex + 1] || segmentStartTime;
      const segmentDuration = segmentEndTime - segmentStartTime;
      
      let progress = 0;
      if (segmentDuration > 0) {
        progress = Math.min(1, (targetTime - segmentStartTime) / segmentDuration);
      }
      
      // Interpolate position
      const toolPosition = new THREE.Vector3(
        c1.x + (c2.x - c1.x) * progress,
        c1.y + (c2.y - c1.y) * progress,
        c1.z + (c2.z - c1.z) * progress
      );
      
      // Get vertex index from baked geometry
      const vertexIndex = this.bakedGeometry?.commandToVertexIndex[cmdIndex] || 0;
      
      framePlan.push({
        commandIndex: cmdIndex,
        vertexIndex,
        toolPosition,
        progress
      });
    }
    
    return framePlan;
  }

  // ============ CANVAS & RENDERER SETUP ============

  private setupCanvas(): void {
    const { width, height, previewContainer } = this.config;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    
    if (previewContainer) {
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
      this.canvas.style.borderRadius = '8px';
      this.canvas.style.display = 'block';
      previewContainer.innerHTML = '';
      previewContainer.appendChild(this.canvas);
    }
  }

  private setupRenderer(): void {
    if (!this.canvas) throw new Error('Canvas not initialized');
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.config.width, this.config.height, false);
    this.renderer.setClearColor(this.config.theme.background, 1);
    
    console.log(`✓ Renderer: ${this.config.width}x${this.config.height}`);
  }

  // ============ SCENE SETUP (giống canvas chính) ============

  private setupScene(): void {
    if (!this.bakedGeometry || !this.renderer) {
      throw new Error('Must bake geometry and setup renderer first');
    }
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.theme.background);
    
    // Camera
    const { bounds } = this.bakedGeometry;
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 100;
    const distance = maxDim * 1.8;
    
    const snap = this.config.cameraSnapshot;
    if (snap) {
      this.camera = new THREE.PerspectiveCamera(
        snap.fov,
        this.config.width / this.config.height,
        snap.near,
        snap.far
      );
      this.camera.position.copy(snap.position);
      this.camera.quaternion.copy(snap.quaternion);
      this.camera.up.copy(snap.up);
    } else {
      this.camera = new THREE.PerspectiveCamera(
        50, 
        this.config.width / this.config.height, 
        0.1, 
        maxDim * 10
      );
      this.camera.position.set(
        center.x + distance * 0.7,
        center.y - distance * 0.7,
        center.z + distance * 0.6
      );
      this.camera.up.set(0, 0, 1);
      this.camera.lookAt(center);
    }
    
    // ============ GHOST LINE (toàn bộ path, mờ) ============
    const ghostGeo = new THREE.BufferGeometry();
    ghostGeo.setAttribute('position', new THREE.Float32BufferAttribute(this.bakedGeometry.positions, 3));
    ghostGeo.setAttribute('color', new THREE.Float32BufferAttribute(this.bakedGeometry.colors, 3));
    
    const ghostMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity: 0.15,
      transparent: true,
      depthWrite: false
    });
    
    this.ghostLine = new THREE.LineSegments(ghostGeo, ghostMat);
    this.scene.add(this.ghostLine);
    
    // ============ ACTIVE LINE (phần đã cắt, sáng) ============
    this.activeGeometry = new THREE.BufferGeometry();
    this.activeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.bakedGeometry.positions.slice(), 3));
    this.activeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(this.bakedGeometry.colors.slice(), 3));
    
    const activeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      opacity: 1.0,
      transparent: false
    });
    
    this.activeLine = new THREE.LineSegments(this.activeGeometry, activeMat);
    this.scene.add(this.activeLine);
    
    // ============ TOOLHEAD (giống canvas chính) ============
    this.toolHead = this.createToolHead();
    this.scene.add(this.toolHead);
    
    // ============ LIGHTING (giống canvas chính) ============
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(distance, -distance, distance);
    this.scene.add(directionalLight);
    
    // ============ GRID ============
    const gridHelper = new THREE.GridHelper(maxDim * 2, 20, 0x334155, 0x1e293b);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.copy(center);
    gridHelper.position.z = bounds.min.z - 1;
    this.scene.add(gridHelper);
    
    // ============ AXES ============
    const axesHelper = new THREE.AxesHelper(maxDim * 0.3);
    axesHelper.position.set(bounds.min.x - 10, bounds.min.y - 10, bounds.min.z);
    this.scene.add(axesHelper);
    
    console.log('✓ Scene ready with ghost/active lines, toolhead, grid, axes');
  }

  private createToolHead(): THREE.Group {
    const { toolConfig } = this.config;
    const group = new THREE.Group();
    
    // Tool bit (bottom)
    const bitGeo = new THREE.CylinderGeometry(
      toolConfig.diameter / 2,
      toolConfig.diameter / 2,
      toolConfig.length,
      32
    );
    const bitMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.9,
      roughness: 0.1,
      emissive: '#e2e8f0',
      emissiveIntensity: 0.2
    });
    const bit = new THREE.Mesh(bitGeo, bitMat);
    bit.position.z = toolConfig.length / 2;
    bit.rotation.x = Math.PI / 2;
    group.add(bit);
    
    // Holder (top)
    const holderGeo = new THREE.CylinderGeometry(
      toolConfig.holderDiameter / 2,
      toolConfig.holderDiameter / 2,
      toolConfig.holderLength,
      32
    );
    const holderMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      metalness: 0.6,
      roughness: 0.4
    });
    const holder = new THREE.Mesh(holderGeo, holderMat);
    holder.position.z = toolConfig.length + toolConfig.holderLength / 2;
    holder.rotation.x = Math.PI / 2;
    group.add(holder);
    
    // Spindle indicator (orange ring)
    const ringGeo = new THREE.CylinderGeometry(
      toolConfig.holderDiameter / 2 * 0.8,
      toolConfig.holderDiameter / 2 * 0.8,
      2,
      32
    );
    const ringMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = toolConfig.length + toolConfig.holderLength + 1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    return group;
  }

  // ============ FRAME UPDATE ============

  private updateSceneForFrame(frame: FrameState): void {
    if (!this.bakedGeometry || !this.activeGeometry || !this.toolHead) return;
    
    // Update tool position
    this.toolHead.position.copy(frame.toolPosition);
    
    // Update draw range for active line (0 → current vertex)
    // Add interpolation within segment
    const baseVertex = frame.vertexIndex;
    const extraVerts = Math.round(frame.progress * 2); // 2 verts per segment
    const drawCount = Math.min(
      this.bakedGeometry.totalVertices,
      baseVertex + extraVerts
    );
    
    this.activeGeometry.setDrawRange(0, drawCount);
  }

  // ============ UTILITIES ============

  private reportProgress(
    phase: TurboExportProgress['phase'],
    current: number,
    total: number,
    progress: number,
    fps: number = 0,
    remaining: number = 0,
    message?: string
  ): void {
    if (this.config.onProgress) {
      this.config.onProgress({
        phase,
        currentFrame: current,
        totalFrames: total,
        progress: Math.max(0, Math.min(1, progress)),
        fps,
        estimatedTimeRemaining: remaining,
        message
      });
    }
  }

  private yieldToMain(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  private dispose(): void {
    // Dispose geometries
    if (this.activeGeometry) {
      this.activeGeometry.dispose();
      this.activeGeometry = null;
    }
    
    if (this.ghostLine) {
      this.ghostLine.geometry.dispose();
      (this.ghostLine.material as THREE.Material).dispose();
      this.ghostLine = null;
    }
    
    if (this.activeLine) {
      (this.activeLine.material as THREE.Material).dispose();
      this.activeLine = null;
    }
    
    // Dispose toolhead
    if (this.toolHead) {
      this.toolHead.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      this.toolHead = null;
    }
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.bakedGeometry = null;
    this.canvas = null;
    
    console.log('✓ Disposed all resources');
  }
}

// ============ EXPORT FUNCTION ============

export async function turboExportVideo(config: TurboExportConfig): Promise<Blob> {
  const engine = new TurboExportEngine(config);
  return engine.export();
}

// ============ LEGACY COMPATIBILITY ============
// Adapter for old API calls from GCodeViewer.tsx

export interface LegacyExportConfig {
  commands: GCodeCommand[];
  speedSlider: number;
  width?: number;
  height?: number;
  format?: VideoFormat;
  cameraSnapshot?: CameraSnapshot | null;
  theme: {
    background: string;
    g0: string;
    g1: string;
    grid: string;
  };
  viewOptions: {
    showRapid: boolean;
    showCutting: boolean;
  };
  onProgress?: (progress: TurboExportProgress) => void;
  encoderConfig?: Partial<WebMEncoderConfig>;
  previewContainer?: HTMLElement | null;
}

export async function turboExportVideoLegacy(config: LegacyExportConfig): Promise<Blob> {
  const speedMultiplier = mapSpeedSliderToMultiplier(config.speedSlider);
  
  const newConfig: TurboExportConfig = {
    commands: config.commands,
    speedMultiplier,
    targetFps: 60,
    width: config.width,
    height: config.height,
    format: config.format || 'webm',
    cameraSnapshot: config.cameraSnapshot,
    theme: {
      ...config.theme,
      arc: config.theme.g1
    },
    viewOptions: {
      ...config.viewOptions,
      highlightArcs: true
    },
    onProgress: config.onProgress,
    encoderConfig: config.encoderConfig,
    previewContainer: config.previewContainer
  };
  
  return turboExportVideo(newConfig);
}

function mapSpeedSliderToMultiplier(slider: number): number {
  // Map 0-100 slider to reasonable speed multipliers
  if (slider <= 40) {
    return 0.1 + (slider / 40) * 1.9; // 0.1x to 2x
  }
  // Higher speeds: exponential
  const t = (slider - 40) / 60;
  return 2 + Math.pow(t, 2) * 98; // 2x to 100x
}
