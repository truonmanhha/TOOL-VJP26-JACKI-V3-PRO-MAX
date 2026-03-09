import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Instance, Instances, Center } from '@react-three/drei';
import * as THREE from 'three';
import { advanceMotion, MotionState } from '@/services/gcodeMotionHelper';
import { renderVideoOffline } from '@/services/offlineRenderer';
import { Play, Pause, RotateCcw, Upload, Code, Monitor, Activity, Zap, Layers, Cpu, Ruler, MousePointer2, Settings, Palette, Eye, EyeOff, Save, X, ListFilter, ChevronDown, Check, MoreHorizontal, Circle, MousePointerClick, Send, Share2, Timer, Maximize, Minimize, Focus, Sparkles, Globe, Rocket, Swords, FastForward, CornerDownRight, ArrowRightCircle, Wrench, Replace, Search, CaseSensitive, Repeat, Undo2, Redo2, Copy, FileCode, RefreshCcw, Loader2, AlertCircle, Terminal, Bot, Gauge, HardDrive, PanelLeftClose, PanelLeftOpen, Home as HomeIcon, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GCodeService } from '../services/gcodeService';
import { GCodeCommand, GCodeAnalysisReport } from '../types';
import { Language, TRANSLATIONS, FORMAT_NUMBER } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { getVideoExportErrorMessage } from '../utils/errorHandling';

const gcodeService = new GCodeService();


interface GCodeViewerProps {
  lang: Language;
  isLiteMode: boolean;
  setIsLiteMode: (val: boolean) => void;
}

interface ThemeConfig {
  background: string;
  grid: string;
  g0: string;
  g1: string;
  arc: string;
  snapPoint: string;
  measureLine: string;
  text: string;
}

interface ToolConfig {
  diameter: number;
  length: number;
  holderDiameter: number;
  holderLength: number;
}

const DEFAULT_THEME: ThemeConfig = {
  background: '#050505',
  grid: '#1e293b',
  g0: '#ef4444',
  g1: '#0ea5e9',
  arc: '#a855f7',
  snapPoint: '#f97316', 
  measureLine: '#10b981',
  text: '#ffffff'
};

const THEME_LABELS: Record<keyof ThemeConfig, string> = {
  background: 'MÀU NỀN',
  grid: 'LƯỚI TỌA ĐỘ',
  g0: 'CHẠY KHÔNG (G0)',
  g1: 'CẮT GỌT (G1)',
  arc: 'CUNG TRÒN (G2/G3)',
  snapPoint: 'ĐIỂM BẮT SNAP',
  measureLine: 'THƯỚC ĐO',
  text: 'MŨI DAO / CHỮ'
};

enum ViewMode {
  FROM_START = 'Hiển thị từ đầu',
  REMAINING_DIMMED = 'Làm mờ phần chưa cắt',
  TO_END = 'Hiển thị đến cuối',
  ENTIRE_Z = 'Toàn bộ Layer Z hiện tại',
  CURRENT_Z = 'Chi Layer Z hiện tại (Single)',
  TAIL = 'Hiển thị đuôi (Comet)',
  LAST_RAPID = 'Từ lệnh G0 gần nhất',
  LAST_TOOL = 'Từ lần thay dao gần nhất'
}

enum StarMode {
  OFF = 'Tắt',
  NORMAL = 'Quả cầu (Normal)',
  INFINITE = 'Vô tận (Infinite)',
  STAR_WARS = 'Vô tận (Star Wars Battle)'
}

interface ViewOptions {
  showToolpath: boolean;
  showPoints: boolean;
  showRapid: boolean;
  showCutting: boolean;
  highlightArcs: boolean;
  highlightElement: boolean;
  largePoints: boolean;
}

const loadSetting = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
};

const highlightGCode = (line: string) => {
  if (!line) return null;
  const parts = [];
  const regex = /([GgMm][0-9\.]+)|([XYZxyz][-0-9\.]+)|([FfSs][-0-9\.]+)|(\(.*\)|;.*)|([A-Za-z0-9\.-]+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex} className="text-slate-500">{line.substring(lastIndex, match.index)}</span>);
    }
    const txt = match[0];
    if (match[1]) parts.push(<span key={match.index} className="text-blue-400 font-bold">{txt}</span>);
    else if (match[2]) parts.push(<span key={match.index} className="text-emerald-400">{txt}</span>);
    else if (match[3]) parts.push(<span key={match.index} className="text-orange-400">{txt}</span>);
    else if (match[4]) parts.push(<span key={match.index} className="text-slate-600 italic">{txt}</span>);
    else parts.push(<span key={match.index} className="text-slate-300">{txt}</span>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={lastIndex} className="text-slate-500">{line.substring(lastIndex)}</span>);
  }
  return parts;
};

const VirtualCodeList = React.memo(({ 
  content, 
  activeLine, 
  onLineClick 
}: { 
  content: string, 
  activeLine: number, // 1-based line number from parsed command
  onLineClick: (lineIndex: number) => void // 0-based index of clicked line
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = useMemo(() => content ? content.split('\n') : [], [content]);
  
  const rowHeight = 24;
  
  // Auto-scroll logic: When activeLine changes, scroll it into view (center)
  useEffect(() => {
    if (activeLine > 0 && scrollRef.current) {
        const targetTop = ((activeLine - 1) * rowHeight) - (scrollRef.current.clientHeight / 2);
        // Use auto behavior for performance during rapid updates, or smooth if it jumps infrequently
        // Since this can be triggered by playback (rapid), we use auto or simple assignment
        scrollRef.current.scrollTop = targetTop;
    }
  }, [activeLine]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const viewportHeight = scrollRef.current?.clientHeight || 600;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
  const endIndex = Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 5);

  const paddingTop = startIndex * rowHeight;
  const paddingBottom = Math.max(0, (lines.length - endIndex) * rowHeight);

  return (
    <div 
      ref={scrollRef} 
      onScroll={handleScroll} 
      className="flex-1 overflow-y-auto bg-[#0b1120] font-mono text-xs p-2 custom-scrollbar relative"
    >
        {lines.length > 0 ? (
            <div style={{ paddingTop, paddingBottom }}>
                {lines.slice(startIndex, endIndex).map((line, i) => {
                    const idx = startIndex + i;
                    const lineNumber = idx + 1;
                    const isActive = lineNumber === activeLine;
                    return (
                        <div 
                          key={idx} 
                          onClick={() => onLineClick(idx)} 
                          className={`flex gap-3 px-2 py-0.5 cursor-pointer hover:bg-white/5 ${isActive ? 'bg-blue-600/30 text-white' : 'text-slate-500'}`}
                          style={{ height: rowHeight }}
                        >
                            <span className="w-6 text-right opacity-30 select-none text-[9px] pt-0.5">{lineNumber}</span>
                            <span className={`${isActive ? 'font-bold' : ''} truncate`}>{highlightGCode(line)}</span>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase tracking-widest text-center px-4">Chưa có dữ liệu</div>
        )}
    </div>
  );
});

const StarChunk: React.FC<{ center: THREE.Vector3, count: number, radius: number }> = ({ center, count, radius }) => {
  const points = useRef<THREE.Points>(null);
  
  const [positions, sizes, timeOffsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const time = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * radius * 2;
      const y = (Math.random() - 0.5) * radius * 2;
      const z = (Math.random() - 0.5) * radius * 2;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      sz[i] = Math.random() * 2 + 0.5;
      time[i] = Math.random() * 100;
    }
    return [pos, sz, time];
  }, [count, radius]);

  const starMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aTimeOffset;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float twinkle = sin(uTime * 2.0 + aTimeOffset) * 0.5 + 0.5; 
          vAlpha = 0.3 + twinkle * 0.7; 
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          float strength = 1.0 - (length(coord) * 2.0);
          gl_FragColor = vec4(uColor, vAlpha * strength);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame((state) => {
    if (points.current && points.current.material) {
      (points.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points ref={points} position={center} frustumCulled={true}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aTimeOffset" count={timeOffsets.length} array={timeOffsets} itemSize={1} />
      </bufferGeometry>
      <primitive object={starMaterial} attach="material" />
    </points>
  );
};

const ChunkedStarField: React.FC<{ mode: StarMode }> = ({ mode }) => {
  if (mode === StarMode.OFF) return null;
  if (mode === StarMode.NORMAL) return <StarChunk center={new THREE.Vector3(0,0,0)} count={2000} radius={400} />;
  const chunks = useMemo(() => {
      const c = [];
      const range = 20000;
      for(let x = -1; x <= 1; x++)
          for(let y = -1; y <= 1; y++)
              for(let z = -1; z <= 1; z++)
                  c.push(new THREE.Vector3(x * range, y * range, z * range));
      return c;
  }, []);
  return <group>{chunks.map((pos, i) => <StarChunk key={i} center={pos} count={5000} radius={10000} />)}</group>;
};

const Explosion: React.FC<{ position: THREE.Vector3, onComplete: () => void }> = ({ position, onComplete }) => {
    const group = useRef<THREE.Group>(null);
    const [scale, setScale] = useState(0.1);
    useFrame((state, delta) => {
        if (scale >= 50) { onComplete(); return; }
        setScale(prev => prev + delta * 80);
    });
    return (
        <group ref={group} position={position} scale={[scale, scale, scale]}>
            <mesh>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial color={scale < 10 ? "#ffffff" : scale < 30 ? "#ffff00" : "#ff4400"} transparent opacity={1 - (scale / 50)} />
            </mesh>
            <mesh scale={[0.8, 0.8, 0.8]}>
                 <sphereGeometry args={[1, 8, 8]} />
                 <meshBasicMaterial color="#ff0000" wireframe />
            </mesh>
        </group>
    );
};

const LaserBolt: React.FC<{ position: THREE.Vector3, direction: THREE.Vector3, color: string }> = ({ position, direction, color }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const [active, setActive] = useState(true);
    const speed = 2500;
    useFrame((state, delta) => {
        if (!active || !mesh.current) return;
        mesh.current.position.add(direction.clone().multiplyScalar(speed * delta));
        if (mesh.current.position.length() > 30000) setActive(false);
    });
    if (!active) return null;
    return (
        <mesh ref={mesh} position={position} rotation={[Math.PI/2, 0, 0]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), direction)}>
            <capsuleGeometry args={[2, 40, 4, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
            <mesh scale={[2, 1, 2]}>
                 <capsuleGeometry args={[2, 35, 4, 8]} />
                 <meshBasicMaterial color={color} transparent opacity={0.4} />
            </mesh>
        </mesh>
    );
};

const TieFighterShip: React.FC<{ offset: number, speed: number, bounds: number }> = ({ offset, speed, bounds }) => {
    const group = useRef<THREE.Group>(null);
    const t = useRef(offset);
    const [lasers, setLasers] = useState<{id: number, pos: THREE.Vector3, dir: THREE.Vector3}[]>([]);
    const [isDead, setIsDead] = useState(false);
    const [explosionPos, setExplosionPos] = useState<THREE.Vector3 | null>(null);
    useFrame((state, delta) => {
        if (isDead) return;
        if(!group.current) return;
        t.current += delta * speed;
        const x = Math.sin(t.current * 0.5) * bounds + Math.cos(t.current * 1.5) * (bounds * 0.2);
        const y = Math.cos(t.current * 0.3) * (bounds * 0.5) + Math.sin(t.current) * 200;
        const z = Math.sin(t.current) * bounds;
        const targetPos = new THREE.Vector3(x, y, z);
        const direction = targetPos.clone().sub(group.current.position).normalize();
        group.current.position.lerp(targetPos, 0.1);
        group.current.lookAt(targetPos.clone().add(direction.multiplyScalar(50)));
        if (Math.random() < 0.03) {
             setLasers(prev => [...prev.slice(-6), { id: Date.now(), pos: group.current!.position.clone(), dir: group.current!.getWorldDirection(new THREE.Vector3()) }]);
        }
        if (Math.random() < 0.002) {
            setExplosionPos(group.current.position.clone());
            setIsDead(true);
            setTimeout(() => { setIsDead(false); setExplosionPos(null); if(group.current) group.current.position.set(Math.random()*2000, Math.random()*2000, Math.random()*2000); }, 3000);
        }
    });
    return (
        <>
            {!isDead && (
                <group ref={group}>
                    <mesh><sphereGeometry args={[12, 16, 16]} /><meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} /></mesh>
                    <mesh position={[0,0,10]}><circleGeometry args={[5, 16]} /><meshBasicMaterial color="#111" /><meshBasicMaterial color="#222" wireframe /></mesh>
                    <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[3, 3, 36]} /><meshStandardMaterial color="#555" /></mesh>
                    {[18, -18].map((pos, i) => (
                        <group key={i} position={[pos, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                            <mesh><circleGeometry args={[28, 6]} /><meshStandardMaterial color="#111" side={THREE.DoubleSide} /></mesh>
                            <mesh><ringGeometry args={[26, 28, 6]} /><meshStandardMaterial color="#888" side={THREE.DoubleSide} /></mesh>
                            <mesh rotation={[0,0,0]}><boxGeometry args={[50, 1, 1]} /><meshStandardMaterial color="#666"/></mesh>
                            <mesh rotation={[0,0,Math.PI/3]}><boxGeometry args={[50, 1, 1]} /><meshStandardMaterial color="#666"/></mesh>
                            <mesh rotation={[0,0,-Math.PI/3]}><boxGeometry args={[50, 1, 1]} /><meshStandardMaterial color="#666"/></mesh>
                        </group>
                    ))}
                </group>
            )}
            {explosionPos && <Explosion position={explosionPos} onComplete={() => {}} />}
            {lasers.map(l => <LaserBolt key={l.id} position={l.pos} direction={l.dir} color="#00ff00" />)}
        </>
    );
};

const XWingShip: React.FC<{ offset: number, speed: number, bounds: number }> = ({ offset, speed, bounds }) => {
    const group = useRef<THREE.Group>(null);
    const t = useRef(offset);
    const [lasers, setLasers] = useState<{id: number, pos: THREE.Vector3, dir: THREE.Vector3}[]>([]);
    const [isDead, setIsDead] = useState(false);
    const [explosionPos, setExplosionPos] = useState<THREE.Vector3 | null>(null);
    useFrame((state, delta) => {
        if (isDead) return;
        if(!group.current) return;
        t.current += delta * speed;
        const x = Math.sin(t.current * 0.5 + 1) * bounds;
        const y = Math.cos(t.current * 0.3 + 1) * (bounds * 0.5);
        const z = Math.sin(t.current + 1) * bounds;
        const targetPos = new THREE.Vector3(x, y, z);
        const direction = targetPos.clone().sub(group.current.position).normalize();
        group.current.position.lerp(targetPos, 0.08); 
        group.current.lookAt(targetPos.clone().add(direction.multiplyScalar(20)));
        if (Math.random() < 0.04) {
             setLasers(prev => [...prev.slice(-6), { id: Date.now(), pos: group.current!.position.clone(), dir: group.current!.getWorldDirection(new THREE.Vector3()) }]);
        }
        if (Math.random() < 0.001) {
            setExplosionPos(group.current.position.clone());
            setIsDead(true);
            setTimeout(() => { setIsDead(false); setExplosionPos(null); if(group.current) group.current.position.set(Math.random()*2000, Math.random()*2000, Math.random()*2000); }, 3000);
        }
    });
    return (
        <>
            {!isDead && (
                <group ref={group}>
                    <mesh rotation={[0,Math.PI/2,0]}><cylinderGeometry args={[3, 3, 60, 8]} /><meshStandardMaterial color="#ddd" /></mesh>
                    <mesh position={[-5, 4, 0]}><boxGeometry args={[15, 4, 5]} /><meshStandardMaterial color="#222" /></mesh>
                    <group position={[-15, 0, 0]}>
                        <mesh rotation={[0, 0, 0.3]} position={[0, 2, 15]}><boxGeometry args={[15, 1, 40]} /><meshStandardMaterial color="#ccc" /></mesh>
                        <mesh rotation={[0, 0, -0.3]} position={[0, -2, 15]}><boxGeometry args={[15, 1, 40]} /><meshStandardMaterial color="#ccc" /></mesh>
                        <mesh rotation={[0, 0, 0.3]} position={[0, 2, -15]}><boxGeometry args={[15, 1, 40]} /><meshStandardMaterial color="#ccc" /></mesh>
                        <mesh rotation={[0, 0, -0.3]} position={[0, -2, -15]}><boxGeometry args={[15, 1, 40]} /><meshStandardMaterial color="#ccc" /></mesh>
                    </group>
                    <group position={[-20, 0, 0]}>
                        {[1, -1].map((side) => (
                            <React.Fragment key={side}>
                                <mesh position={[0, 4 * side, 8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[3,3,15]} /><meshStandardMaterial color="#999" /></mesh>
                                <mesh position={[-8, 4 * side, 8]} rotation={[0,0,Math.PI/2]}><circleGeometry args={[2.5]} /><meshBasicMaterial color="#ff66cc" /></mesh>
                                <mesh position={[0, 4 * side, -8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[3,3,15]} /><meshStandardMaterial color="#999" /></mesh>
                                <mesh position={[-8, 4 * side, -8]} rotation={[0,0,Math.PI/2]}><circleGeometry args={[2.5]} /><meshBasicMaterial color="#ff66cc" /></mesh>
                            </React.Fragment>
                        ))}
                    </group>
                    <mesh position={[-10, 8, 34]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.5,0.5,20]} /><meshStandardMaterial color="#555"/></mesh>
                    <mesh position={[-10, -8, 34]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.5,0.5,20]} /><meshStandardMaterial color="#555"/></mesh>
                    <mesh position={[-10, 8, -34]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.5,0.5,20]} /><meshStandardMaterial color="#555"/></mesh>
                    <mesh position={[-10, -8, -34]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.5,0.5,20]} /><meshStandardMaterial color="#555"/></mesh>
                </group>
            )}
            {explosionPos && <Explosion position={explosionPos} onComplete={() => {}} />}
            {lasers.map(l => <LaserBolt key={l.id} position={l.pos} direction={l.dir} color="#ff0000" />)}
        </>
    );
};

const StarWarsBattleScene: React.FC = () => (
    <group>
         {Array.from({length: 6}).map((_, i) => <TieFighterShip key={`tie-${i}`} offset={i * 1000} speed={0.5 + Math.random() * 0.5} bounds={400} />)}
         {Array.from({length: 4}).map((_, i) => <XWingShip key={`xwing-${i}`} offset={i * 1200 + 500} speed={0.6 + Math.random() * 0.4} bounds={400} />)}
    </group>
);

const ViewCubeController = forwardRef(({ controlsRef }: { controlsRef: any }, ref) => {
  const { camera } = useThree();
  
  const animateView = useCallback((targetOffset: THREE.Vector3, targetUp: THREE.Vector3) => {
      const controls = controlsRef.current;
      if (!controls) return;
      
      const target = controls.target.clone();
      const currentDist = camera.position.distanceTo(target);
      
      // Calculate new position while maintaining distance
      const newPos = target.clone().add(targetOffset.normalize().multiplyScalar(currentDist));
      
      const startPos = camera.position.clone();
      const startUp = camera.up.clone();
      const startTime = Date.now();
      const duration = 500; // ms
      
      const animate = () => {
          const now = Date.now();
          const progress = Math.min((now - startTime) / duration, 1);
          // Ease out quint
          const ease = 1 - Math.pow(1 - progress, 5);
          
          camera.position.lerpVectors(startPos, newPos, ease);
          camera.up.lerpVectors(startUp, targetUp, ease);
          camera.lookAt(target);
          controls.update();
          
          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      };
      animate();
  }, [camera, controlsRef]);

  const setView = useCallback((view: 'TOP' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'HOME') => {
      switch(view) {
          case 'TOP': animateView(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)); break;
          case 'FRONT': animateView(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1)); break;
          case 'BACK': animateView(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)); break;
          case 'RIGHT': animateView(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)); break;
          case 'LEFT': animateView(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1)); break;
          case 'HOME': animateView(new THREE.Vector3(1, -1, 1), new THREE.Vector3(0, 0, 1)); break;
      }
  }, [animateView]);

  const rotate90 = useCallback(() => {
      // Rotate 90 degrees clockwise around Z axis relative to target
      const controls = controlsRef.current;
      if (!controls) return;
      const target = controls.target;
      const offset = camera.position.clone().sub(target);
      // Rotate around Z axis
      offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
      animateView(offset, camera.up.clone());
  }, [camera, controlsRef, animateView]);

  useImperativeHandle(ref, () => ({
      setView,
      rotate90
  }));

  return null;
});

const ViewCubeUI: React.FC<{ 
    onSetView: (view: 'TOP' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'HOME') => void;
    onRotate: () => void;
}> = ({ onSetView, onRotate }) => {
    return (
        <div className="absolute top-20 right-6 z-40 flex flex-col items-end select-none pointer-events-auto">
             <div className="relative w-24 h-24 group">
                 <button onClick={() => onSetView('HOME')} className="absolute -top-3 -left-3 p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 rounded-full border border-white/10 shadow-lg z-20 transition-all active:scale-95" title="Home View">
                    <HomeIcon size={14} />
                 </button>
                 <button onClick={onRotate} className="absolute -top-3 -right-3 p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 rounded-full border border-white/10 shadow-lg z-20 transition-all active:scale-95" title="Rotate 90°">
                    <RotateCw size={14} />
                 </button>
                 <div className="w-full h-full bg-slate-900/90 rounded-full border-[3px] border-slate-700/50 relative flex items-center justify-center shadow-2xl backdrop-blur-md">
                     <button onClick={() => onSetView('BACK')} className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center text-[10px] font-black text-slate-500 hover:text-white transition-colors z-10 hover:bg-white/5 rounded active:scale-95">N</button>
                     <button onClick={() => onSetView('FRONT')} className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-6 flex items-center justify-center text-[10px] font-black text-slate-500 hover:text-white transition-colors z-10 hover:bg-white/5 rounded active:scale-95">S</button>
                     <button onClick={() => onSetView('LEFT')} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center text-[10px] font-black text-slate-500 hover:text-white transition-colors z-10 hover:bg-white/5 rounded active:scale-95">W</button>
                     <button onClick={() => onSetView('RIGHT')} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center text-[10px] font-black text-slate-500 hover:text-white transition-colors z-10 hover:bg-white/5 rounded active:scale-95">E</button>
                     <button onClick={() => onSetView('TOP')} className="w-12 h-12 bg-slate-300 hover:bg-white text-black font-black text-[10px] flex items-center justify-center rounded-[4px] shadow-inner transition-all z-0 border-2 border-slate-400 hover:border-white hover:scale-105 active:scale-95">
                        TOP
                     </button>
                     <div className="absolute top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-slate-600 pointer-events-none" />
                     <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] border-t-slate-600 pointer-events-none" />
                     <div className="absolute left-5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-r-[5px] border-r-slate-600 pointer-events-none" />
                     <div className="absolute right-5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-slate-600 pointer-events-none" />
                 </div>
                 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 px-2 py-0.5 rounded text-[8px] font-black text-slate-500 border border-white/10 flex items-center gap-1 cursor-default whitespace-nowrap shadow-lg">
                    <span>WCS</span> <ChevronDown size={8} />
                 </div>
             </div>
        </div>
    );
};

const ToolHead: React.FC<{ positionRef: React.MutableRefObject<THREE.Vector3>; color: string; config: ToolConfig; isLiteMode: boolean }> = ({ positionRef, color, config, isLiteMode }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => { if (groupRef.current && positionRef.current) groupRef.current.position.copy(positionRef.current); });
  if (isLiteMode) return (
        <group ref={groupRef}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0, config.diameter, config.length + config.holderLength, 4]} /><meshBasicMaterial color="#ef4444" wireframe={true} /></mesh></group>
  );
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, config.length / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[config.diameter / 2, config.diameter / 2, config.length, 32]} /><meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} emissive="#e2e8f0" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, 0, config.length + config.holderLength / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[config.holderDiameter / 2, config.holderDiameter / 2, config.holderLength, 32]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0, config.length + config.holderLength + 1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[config.holderDiameter / 2 * 0.8, config.holderDiameter / 2 * 0.8, 2, 32]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} /></mesh>
    </group>
  );
};

const ToolPath: React.FC<{ 
    commands: GCodeCommand[]; 
    theme: ThemeConfig; 
    currentIndex: number;
    viewMode: ViewMode;
    viewOptions: ViewOptions;
    isLiteMode: boolean;
    onSegmentClick: (index: number) => void;
}> = React.memo(({ commands, theme, currentIndex, viewMode, viewOptions, isLiteMode, onSegmentClick }) => {
  const activeLineRef = useRef<THREE.LineSegments>(null);
  const ghostLineRef = useRef<THREE.LineSegments>(null);
  const interactionRef = useRef<THREE.LineSegments>(null);
  const { raycaster, camera, pointer } = useThree();
  const [highlightSeg, setHighlightSeg] = useState<{start: THREE.Vector3, end: THREE.Vector3} | null>(null);

  const { geometry, interactionGeometry, segmentsMap, commandToVertexIndex, lastG0Indices, lastToolIndices } = useMemo(() => {
      const positions: number[] = [];
      const colors: number[] = [];
      const interactionPositions: number[] = [];
      const segMap: {start: THREE.Vector3, end: THREE.Vector3, originalIndex: number}[] = [];
      
      const cmdToVert = new Int32Array(commands.length);
      const lastG0Idx = new Int32Array(commands.length);
      const lastToolIdx = new Int32Array(commands.length);
      
      let currentVertCount = 0;
      let currentG0 = 0;
      let currentTool = 0;

      const colG0 = new THREE.Color(theme.g0);
      const colG1 = new THREE.Color(theme.g1);
      const colArc = new THREE.Color(theme.arc);

      for (let i = 0; i < commands.length - 1; i++) {
          const c1 = commands[i];
          const c2 = commands[i+1];
          
          if (c2.type === 'G0') currentG0 = i + 1;
          if (c2.code.includes('M6') || c2.code.includes('T')) currentTool = i + 1;
          
          lastG0Idx[i] = currentG0;
          lastToolIdx[i] = currentTool;
          cmdToVert[i] = currentVertCount;

          if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;
          if (Math.abs(c1.x - c2.x) < 0.001 && Math.abs(c1.y - c2.y) < 0.001 && Math.abs(c1.z - c2.z) < 0.001) continue;

          let visible = true;
          if (c2.type === 'G0' && !viewOptions.showRapid) visible = false;
          if ((c2.type === 'G1' || c2.type === 'G2' || c2.type === 'G3') && !viewOptions.showCutting) visible = false;

          // Handle G2 / G3 interpolation (Arcs)
          if ((c2.type === 'G2' || c2.type === 'G3') && (c2.i !== undefined || c2.j !== undefined || c2.r !== undefined)) {
              // Interpolate arc
              let cx = c1.x, cy = c1.y;
              if (c2.r !== undefined && c2.r !== 0) {
                  const x1 = c1.x, y1 = c1.y, x2 = c2.x, y2 = c2.y;
                  const d = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
                  let r = Math.abs(c2.r);
                  if (d > 0 && d <= 2*r) {
                      const h = Math.sqrt(r**2 - (d/2)**2);
                      const mx = (x1+x2)/2, my = (y1+y2)/2;
                      const dx = (y2-y1)/d, dy = -(x2-x1)/d;
                      const isMajor = c2.r < 0;
                      // G2 is CW, G3 is CCW
                      let sign = (c2.type === 'G2') ? 1 : -1;
                      if (isMajor) sign *= -1;
                      cx = mx + sign * h * dx;
                      cy = my + sign * h * dy;
                  } else {
                      cx = (x1+x2)/2; cy = (y1+y2)/2; // Fallback
                  }
              } else {
                  cx = c1.x + (c2.i || 0);
                  cy = c1.y + (c2.j || 0);
              }
              
              const startAngle = Math.atan2(c1.y - cy, c1.x - cx);
              const endAngle = Math.atan2(c2.y - cy, c2.x - cx);
              
              const radius = Math.sqrt(Math.pow(c1.x - cx, 2) + Math.pow(c1.y - cy, 2));
              
              let angleDiff = endAngle - startAngle;
              if (c2.type === 'G2') { // Clockwise
                  if (angleDiff > 0) angleDiff -= 2 * Math.PI;
              } else { // G3 - Counter-clockwise
                  if (angleDiff < 0) angleDiff += 2 * Math.PI;
              }
              
              // Only draw if there's an actual arc
              if (Math.abs(angleDiff) > 0.0001) {
                  // Segment length approximately 1mm or max 30 segments per circle
                  const segments = Math.max(16, Math.min(128, Math.ceil(Math.abs(angleDiff) / (2 * Math.PI) * 128)));
                  
                  let prevX = c1.x;
                  let prevY = c1.y;
                  let prevZ = c1.z;
                  
                  for (let s = 1; s <= segments; s++) {
                      const t = s / segments;
                      const angle = startAngle + angleDiff * t;
                      
                      const currX = cx + radius * Math.cos(angle);
                      const currY = cy + radius * Math.sin(angle);
                      const currZ = c1.z + (c2.z - c1.z) * t;
                      
                      if (!isLiteMode) {
                          segMap.push({ start: new THREE.Vector3(prevX, prevY, prevZ), end: new THREE.Vector3(currX, currY, currZ), originalIndex: i });
                          interactionPositions.push(prevX, prevY, prevZ, currX, currY, currZ);
                      }
                      
                      if (visible) {
                          positions.push(prevX, prevY, prevZ, currX, currY, currZ);
                          if (!isLiteMode) {
                              let col = viewOptions.highlightArcs ? colArc : colG1;
                              colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
                          }
                          currentVertCount += 2;
                      }
                      
                      prevX = currX;
                      prevY = currY;
                      prevZ = currZ;
                  }
                  continue; // Skip the default straight line logic
              }
          }

          // Default logic for G0 and G1 (Straight lines)
          if (!isLiteMode) {
              segMap.push({ start: new THREE.Vector3(c1.x, c1.y, c1.z), end: new THREE.Vector3(c2.x, c2.y, c2.z), originalIndex: i });
              interactionPositions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
          }

          if (visible) {
              positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
              if (!isLiteMode) {
                  let col = colG1;
                  if (c2.type === 'G0') col = colG0;
                  else if ((c2.type === 'G2' || c2.type === 'G3') && viewOptions.highlightArcs) col = colArc;
                  colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
              }
              currentVertCount += 2;
          }
      }
      
      if (commands.length > 0) {
          cmdToVert[commands.length - 1] = currentVertCount;
          lastG0Idx[commands.length - 1] = currentG0;
          lastToolIdx[commands.length - 1] = currentTool;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (!isLiteMode) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      let intGeo = undefined;
      if (!isLiteMode) {
          intGeo = new THREE.BufferGeometry();
          intGeo.setAttribute('position', new THREE.Float32BufferAttribute(interactionPositions, 3));
      }

      return { 
          geometry: geo, 
          interactionGeometry: intGeo, 
          segmentsMap: segMap, 
          commandToVertexIndex: cmdToVert,
          lastG0Indices: lastG0Idx,
          lastToolIndices: lastToolIdx
      };
  }, [commands, theme, viewOptions.showRapid, viewOptions.showCutting, viewOptions.highlightArcs, isLiteMode]);

  useFrame(() => {
      if (!activeLineRef.current || !ghostLineRef.current) return;

      const drawLimit = commandToVertexIndex[currentIndex] || 0;
      const totalVerts = commandToVertexIndex[commands.length - 1] || 0;

      switch (viewMode) {
          case ViewMode.REMAINING_DIMMED:
              // LOGIC MỚI:
              // Ghost Line: Hiển thị TOÀN BỘ đường chạy (0 -> total) dưới dạng mờ (background).
              ghostLineRef.current.geometry.setDrawRange(0, totalVerts);
              ghostLineRef.current.visible = true;
              
              // Active Line: Hiển thị phần ĐÃ CẮT (0 -> current) dưới dạng sáng (foreground), đè lên ghost line.
              activeLineRef.current.geometry.setDrawRange(0, drawLimit);
              activeLineRef.current.visible = true;
              break;

          case ViewMode.FROM_START:
              activeLineRef.current.geometry.setDrawRange(0, drawLimit);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
              break;

          case ViewMode.TO_END:
              activeLineRef.current.geometry.setDrawRange(drawLimit, totalVerts - drawLimit);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
              break;

          case ViewMode.TAIL:
              const tailSize = 500;
              const startTail = Math.max(0, drawLimit - tailSize);
              activeLineRef.current.geometry.setDrawRange(startTail, drawLimit - startTail);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
              break;

          case ViewMode.LAST_RAPID:
              const startG0 = commandToVertexIndex[lastG0Indices[currentIndex]] || 0;
              activeLineRef.current.geometry.setDrawRange(startG0, drawLimit - startG0);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
              break;

          case ViewMode.LAST_TOOL:
              const startTool = commandToVertexIndex[lastToolIndices[currentIndex]] || 0;
              activeLineRef.current.geometry.setDrawRange(startTool, drawLimit - startTool);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
              break;

          default:
              activeLineRef.current.geometry.setDrawRange(0, totalVerts);
              activeLineRef.current.visible = true;
              ghostLineRef.current.visible = false;
      }
  });

  useFrame(() => {
     if (isLiteMode) return;
     if (!viewOptions.highlightElement || !interactionRef.current) { if (highlightSeg) setHighlightSeg(null); return; }
     raycaster.setFromCamera(pointer, camera);
     raycaster.params.Line.threshold = 3; 
     const intersects = raycaster.intersectObject(interactionRef.current);
     if (intersects.length > 0) {
         const index = intersects[0].index;
         if (index !== undefined) {
             const segIdx = Math.floor(index / 2);
             if (segmentsMap[segIdx]) { setHighlightSeg(segmentsMap[segIdx]); document.body.style.cursor = 'pointer'; return; }
         }
     }
     setHighlightSeg(null); document.body.style.cursor = 'default';
  });

  return (
    <group>
      {!isLiteMode && interactionGeometry && (
          <lineSegments ref={interactionRef} geometry={interactionGeometry} onClick={(e) => { e.stopPropagation(); if (e.index !== undefined) { const segIdx = Math.floor(e.index / 2); const segment = segmentsMap[segIdx]; if (segment) onSegmentClick(segment.originalIndex); } }} visible={true}><lineBasicMaterial color="#ffffff" opacity={0} transparent depthWrite={false} /></lineSegments>
      )}
      {/* Ghost Line (Background/Dimmed) */}
      <lineSegments ref={ghostLineRef} geometry={geometry} raycast={() => null} renderOrder={0}><lineBasicMaterial color={isLiteMode ? "#333333" : theme.g1} opacity={isLiteMode ? 0.2 : 0.15} transparent depthWrite={false} depthTest={true} /></lineSegments>
      {/* Active Line (Foreground/Bright) */}
      <lineSegments ref={activeLineRef} geometry={geometry} raycast={() => null} renderOrder={1}>{isLiteMode ? <lineBasicMaterial color={theme.g1} opacity={1} linewidth={1} /> : <lineBasicMaterial vertexColors opacity={1} linewidth={1} depthTest={true} />}</lineSegments>
      {highlightSeg && !isLiteMode && <Line start={highlightSeg.start} end={highlightSeg.end} color="#ffffff" linewidth={4} />}
    </group>
  );
});

const MeasurementSystem: React.FC<{ 
  commands: GCodeCommand[]; 
  snapMode: boolean; 
  showPointsMode: boolean;
  largePointsMode: boolean;
  theme: ThemeConfig;
  measurePoints: THREE.Vector3[];
  onPointClick: (pt: THREE.Vector3) => void;
  isLiteMode: boolean;
}> = ({ commands, snapMode, showPointsMode, largePointsMode, theme, measurePoints, onPointClick, isLiteMode }) => {
  const { camera, raycaster, pointer } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [cursorPoint, setCursorPoint] = useState<THREE.Vector3 | null>(null);
  const vertices = useMemo(() => { const verts: number[] = []; commands.forEach(cmd => { if (cmd.type !== 'OTHER') verts.push(cmd.x, cmd.y, cmd.z); }); return new Float32Array(verts); }, [commands]);
  
  useEffect(() => { 
    // Increase threshold for better clickability
    // 3 for normal, 5 for large points is more reasonable for typical G-code scale
    if (raycaster.params.Points) raycaster.params.Points.threshold = largePointsMode ? 5 : 3; 
  }, [raycaster, largePointsMode]);

  useFrame(() => {
    if (isLiteMode) return;
    const pointsVisible = showPointsMode || snapMode;
    if (!pointsVisible || !pointsRef.current) { setHoveredIndex(null); setCursorPoint(null); return; }
    
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointsRef.current);
    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) { setHoveredIndex(index); document.body.style.cursor = 'crosshair'; const x = vertices[index * 3], y = vertices[index * 3 + 1], z = vertices[index * 3 + 2]; setCursorPoint(new THREE.Vector3(x, y, z)); return; }
    }
    setHoveredIndex(null); setCursorPoint(null);
  });

  const handlePointerDown = (e: any) => { if (isLiteMode) return; if (snapMode && hoveredIndex !== null) { e.stopPropagation(); const x = vertices[hoveredIndex * 3], y = vertices[hoveredIndex * 3 + 1], z = vertices[hoveredIndex * 3 + 2]; onPointClick(new THREE.Vector3(x, y, z)); } };
  
  return (
    <group>
      {!isLiteMode && (
         <points ref={pointsRef} onClick={handlePointerDown} visible={true}>
            <bufferGeometry><bufferAttribute attach="attributes-position" count={vertices.length / 3} array={vertices} itemSize={3} /></bufferGeometry>
            <pointsMaterial 
                size={largePointsMode ? 15 : 6} 
                sizeAttenuation={false} 
                color={theme.snapPoint} 
                transparent={true} 
                opacity={(showPointsMode || snapMode) ? 1 : 0} 
            />
         </points>
      )}
      {(snapMode || showPointsMode) && cursorPoint && !isLiteMode && (
        <mesh position={cursorPoint}>
          <sphereGeometry args={[2.5, 16, 16]} /><meshBasicMaterial color={theme.snapPoint} transparent opacity={0.8} />
          <mesh scale={[1.5, 1.5, 1.5]}><sphereGeometry args={[2.5, 16, 16]} /><meshBasicMaterial color={theme.snapPoint} transparent opacity={0.3} wireframe /></mesh>
        </mesh>
      )}
      {measurePoints.map((pt, i) => <mesh key={`pt-${i}`} position={pt}><sphereGeometry args={[1.5, 16, 16]} /><meshBasicMaterial color={theme.measureLine} /></mesh>)}
      {measurePoints.length === 2 && (
        <group><Line start={measurePoints[0]} end={measurePoints[1]} color={theme.measureLine} /><Html position={[(measurePoints[0].x + measurePoints[1].x)/2, (measurePoints[0].y + measurePoints[1].y)/2, (measurePoints[0].z + measurePoints[1].z)/2 + 5]}><div className="bg-black/90 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold whitespace-nowrap border border-white/20 shadow-xl">D: {measurePoints[0].distanceTo(measurePoints[1]).toFixed(3)}mm</div></Html></group>
      )}
      {measurePoints.length === 1 && cursorPoint && !isLiteMode && (
           <group><Line start={measurePoints[0]} end={cursorPoint} color={theme.measureLine} dashed={true} /><Html position={cursorPoint} style={{pointerEvents:'none'}}><div className="text-xs bg-orange-500 text-white px-2 py-1 rounded ml-4 font-bold">{measurePoints[0].distanceTo(cursorPoint).toFixed(2)}</div></Html></group>
      )}
    </group>
  );
};

const Line = ({ start, end, color, dashed = false, linewidth = 2 }: { start: THREE.Vector3, end: THREE.Vector3, color: string, dashed?: boolean, linewidth?: number }) => {
    const ref = useRef<THREE.Line>(null);
    useMemo(() => { if(ref.current) { ref.current.geometry.setFromPoints([start, end]); if (dashed) ref.current.computeLineDistances(); } }, [start, end, dashed]);
    return (<line ref={ref as any}><bufferGeometry />{dashed ? <lineDashedMaterial color={color} dashSize={2} gapSize={1} linewidth={linewidth} scale={1} /> : <lineBasicMaterial color={color} linewidth={linewidth} />}</line>);
};


const UpdateMiniCamera = ({ cameraRef }: { cameraRef: React.MutableRefObject<any> }) => {
    const { camera } = useThree();
    useEffect(() => {
        cameraRef.current = camera;
    }, [camera, cameraRef]);
    return null;
};

const SceneContent: React.FC<{ 
    commands: GCodeCommand[], 
    currentCmd: GCodeCommand,
    interpolatedPosRef: React.MutableRefObject<THREE.Vector3>,
    theme: ThemeConfig, 
    toolConfig: ToolConfig,
    showGrid: boolean, 
    snapMode: boolean,
    measurePoints: THREE.Vector3[],
    setMeasurePoints: (pts: THREE.Vector3[]) => void,
    currentIndex: number,
    viewMode: ViewMode,
    viewOptions: ViewOptions,
    starMode: StarMode,
    zoomFitTrigger: number,
    onSegmentClick: (index: number) => void,
    isLiteMode: boolean,
    viewCubeControllerRef?: React.Ref<any>
}> = ({ commands, interpolatedPosRef, theme, toolConfig, showGrid, snapMode, measurePoints, setMeasurePoints, currentIndex, viewMode, viewOptions, starMode, zoomFitTrigger, onSegmentClick, isLiteMode, viewCubeControllerRef }) => {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);
    const initRef = useRef(false);
    const fitView = useCallback(() => {
        if (commands.length === 0) {
            // Fit to tool (origin or interpolatedPosRef.current)
            const center = interpolatedPosRef.current || new THREE.Vector3(0, 0, 0);
            camera.position.set(center.x + 100, center.y - 100, center.z + 100);
            camera.up.set(0, 0, 1); camera.lookAt(center);
            if (controlsRef.current) { controlsRef.current.target.copy(center); controlsRef.current.update(); }
            return;
        }
        const box = new THREE.Box3();
        let hasPoints = false;
        commands.forEach(cmd => { if (cmd.type !== 'OTHER') { box.expandByPoint(new THREE.Vector3(cmd.x, cmd.y, cmd.z)); hasPoints = true; } });
        
        if (hasPoints) {
            const center = new THREE.Vector3(); box.getCenter(center);
            const size = new THREE.Vector3(); box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 100;
            const distance = maxDim * 2; 
            camera.position.set(center.x + distance, center.y - distance, center.z + distance * 0.8);
            camera.up.set(0, 0, 1); camera.lookAt(center);
            if (controlsRef.current) { controlsRef.current.target.copy(center); controlsRef.current.update(); }
        } else {
            const center = interpolatedPosRef.current || new THREE.Vector3(0, 0, 0);
            camera.position.set(center.x + 100, center.y - 100, center.z + 100);
            camera.up.set(0, 0, 1); camera.lookAt(center);
            if (controlsRef.current) { controlsRef.current.target.copy(center); controlsRef.current.update(); }
        }
    }, [commands, camera, interpolatedPosRef]);
    useEffect(() => { if (!initRef.current) { fitView(); initRef.current = true; } else if (commands.length > 0 && !initRef.current) { fitView(); initRef.current = true; } }, [commands, fitView]);
    useEffect(() => { if (commands.length === 0) initRef.current = false; }, [commands]);
    useEffect(() => { if (zoomFitTrigger > 0) fitView(); }, [zoomFitTrigger, fitView]);
    return (
        <>
            <OrbitControls ref={controlsRef} makeDefault dampingFactor={0.1} />
            <ambientLight intensity={0.5} /><pointLight position={[100, 100, 100]} intensity={1} />
            {!isLiteMode && <ChunkedStarField mode={starMode} />}
            {!isLiteMode && starMode === StarMode.STAR_WARS && <StarWarsBattleScene />}
            <axesHelper args={[100]} />
            {showGrid && !isLiteMode && <gridHelper key={theme.grid} args={[2000, 40, theme.grid, theme.grid]} rotation={[Math.PI / 2, 0, 0]} />}
            <ToolPath commands={commands} theme={theme} currentIndex={currentIndex} viewMode={viewMode} viewOptions={viewOptions} onSegmentClick={onSegmentClick} isLiteMode={isLiteMode} />
            <ToolHead positionRef={interpolatedPosRef} color={theme.text} config={toolConfig} isLiteMode={isLiteMode} />
            <MeasurementSystem commands={commands} snapMode={snapMode} showPointsMode={viewOptions.showPoints} largePointsMode={viewOptions.largePoints} theme={theme} measurePoints={measurePoints} onPointClick={pt => { if (measurePoints.length >= 2) setMeasurePoints([pt]); else setMeasurePoints([...measurePoints, pt]); }} isLiteMode={isLiteMode} />
            {!isLiteMode && <ViewCubeController ref={viewCubeControllerRef} controlsRef={controlsRef} />}
        </>
    );
};

const GCodeViewer: React.FC<GCodeViewerProps> = ({ lang, isLiteMode, setIsLiteMode }) => {
  const t = TRANSLATIONS[lang];
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempContent, setTempContent] = useState('');
  const [commands, setCommands] = useState<GCodeCommand[]>([]);
  const [analysis, setAnalysis] = useState<GCodeAnalysisReport | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true); // Trạng thái ẩn/hiện mã
  const [speedSliderVal, setSpeedSliderVal] = useState(() => loadSetting('vjp26_gc_speed', 15));
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [videoExportState, setVideoExportState] = useState<'idle' | 'rendering' | 'uploading' | 'done' | 'error'>('idle');
  const [videoExportProgress, setVideoExportProgress] = useState(0);
  const [videoExportErrorMessageState, setVideoExportErrorMessageState] = useState('');



  const [showGrid, setShowGrid] = useState(() => loadSetting('vjp26_gc_grid', true));
  const [snapMode, setSnapMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(() => loadSetting('vjp26_gc_theme', DEFAULT_THEME));
  const [is3DFullScreen, setIs3DFullScreen] = useState(false);
  const [isWorkspaceLocked, setIsWorkspaceLocked] = useState(false);
  const [showBorderFlash, setShowBorderFlash] = useState(false);
  const [zoomFitTrigger, setZoomFitTrigger] = useState(0);
  const [gpuName, setGpuName] = useState<string>('Unknown GPU');
  const [cpuThreads, setCpuThreads] = useState<number>(window.navigator.hardwareConcurrency || 4);
  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));

  const [showGpuWarning, setShowGpuWarning] = useState(false);
  const [isAutoFixingGpu, setIsAutoFixingGpu] = useState(false);

  useEffect(() => {
    if (gpuPreference === 'high-performance' && gpuName) {
        const isIntel = gpuName.toLowerCase().includes('intel');
        const isAMDOnboard = gpuName.toLowerCase().includes('radeon graphics');
        const isAngle = gpuName.toLowerCase().includes('angle') || gpuName.toLowerCase().includes('swiftshader');
        
        const hasWarned = sessionStorage.getItem('vjp26_gpu_warned');
        
        if ((isIntel || isAMDOnboard || isAngle) && !hasWarned && gpuName !== 'Unknown GPU') {
            setShowGpuWarning(true);
            sessionStorage.setItem('vjp26_gpu_warned', 'true');
        }
    }
  }, [gpuName, gpuPreference]);

  const handleAutoFixGPU = async () => {
      setIsAutoFixingGpu(true);
      try {
          // Gọi xuống server local (Node.js) để nó chạy file .bat
          await fetch('http://localhost:3000/api/fix-gpu', { method: 'POST' });
          // Màn hình sẽ chớp và trình duyệt tự khởi động lại nhờ file .bat
      } catch (e) {
          console.error('Không thể tự động fix GPU qua backend', e);
          setIsAutoFixingGpu(false);
          alert('Không thể kết nối đến máy chủ Local. Vui lòng chạy file KHỞI_ĐỘNG_TOOL_GPU.bat thủ công ở thư mục gốc.');
      }
  };

  const [showGpuMenu, setShowGpuMenu] = useState(false);
  const [detectedGpus, setDetectedGpus] = useState<{high: string, low: string}>({ high: 'Đang quét...', low: 'Đang quét...' });
  
  useEffect(() => {
    // Luôn quét sẵn để người dùng có thể thấy ngay
    const getGpu = (pref: WebGLPowerPreference) => {
        try {
            const canvas = document.createElement('canvas');
            const options = { 
                powerPreference: pref,
                failIfMajorPerformanceCaveat: pref === 'high-performance'
            };
            const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
            if (!gl) return 'Không xác định (Fallback)';
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (!ext) return 'Không xác định (No Ext)';
            const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            return renderer ? renderer.replace(/ANGLE \((.*)\)/, '$1').split(' Direct3D')[0].substring(0, 40) : 'Không xác định';
        } catch(e) { return 'Không xác định (Lỗi)'; }
    };
    
    // We run it with a slight delay to ensure browser has settled
    setTimeout(async () => {
        let highGpu = getGpu('high-performance');
        let lowGpu = getGpu('low-power');

        // Let's also try WebGPU to extract accurate adapter names if WebGL is returning the same for both!
        if (navigator.gpu) {
            try {
                const highAdapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
                if (highAdapter && highAdapter.info && highAdapter.info.device) {
                    highGpu = highAdapter.info.device + ' (WebGPU)';
                }
                const lowAdapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
                if (lowAdapter && lowAdapter.info && lowAdapter.info.device) {
                    lowGpu = lowAdapter.info.device + ' (WebGPU)';
                }
            } catch(e) { console.warn('WebGPU info extraction failed', e); }
        }

        setDetectedGpus({
            high: highGpu,
            low: lowGpu
        });
    }, 500);
  }, []);
  useEffect(() => localStorage.setItem('vjp26_gc_gpu_pref', JSON.stringify(gpuPreference)), [gpuPreference]);
  const [toolConfig, setToolConfig] = useState<ToolConfig>(() => loadSetting('vjp26_gc_tool', { diameter: 6, length: 20, holderDiameter: 25, holderLength: 20 }));
  const [showToolConfig, setShowToolConfig] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadSetting('vjp26_gc_viewmode', ViewMode.REMAINING_DIMMED));
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);
  const [starMode, setStarMode] = useState<StarMode>(() => loadSetting('vjp26_gc_starmode', StarMode.NORMAL));
  const [showStarMenu, setShowStarMenu] = useState(false);
  const [showJumpInput, setShowJumpInput] = useState(false);
  const [jumpTarget, setJumpTarget] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wrapAround, setWrapAround] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimeoutRef = useRef<any>(null);
  const isUndoRedoAction = useRef(false);
  const [viewOptions, setViewOptions] = useState<ViewOptions>(() => loadSetting('vjp26_gc_options', { showToolpath: true, showPoints: false, showRapid: true, showCutting: true, highlightArcs: true, highlightElement: true, largePoints: false }));
  const [showViewOptionsMenu, setShowViewOptionsMenu] = useState(false);
  const interpolatedPosRef = useRef(new THREE.Vector3(0,0,0));
  const [displayPos, setDisplayPos] = useState(new THREE.Vector3(0,0,0));
  const [elapsedTime, setElapsedTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const viewCubeControllerRef = useRef<any>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const miniCameraRef = useRef<THREE.Camera>(null);



  const handleVideoExport = useCallback(async () => {
    const isRendering = videoExportState === 'rendering';
    const isUploading = videoExportState === 'uploading';
    if (isRendering || isUploading || !analysis || commands.length === 0) return;

    setVideoExportErrorMessageState('');


    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 1280;
    offscreenCanvas.height = 720;
    offscreenCanvas.style.width = '100%';
    offscreenCanvas.style.height = 'auto';
    offscreenCanvas.style.borderRadius = '8px';
    if (videoPreviewRef.current) {
        videoPreviewRef.current.innerHTML = '';
        videoPreviewRef.current.appendChild(offscreenCanvas);
    }


    let renderer: THREE.WebGLRenderer | null = null;
    let activeGeo: THREE.BufferGeometry | null = null;
    let ghostGeo: THREE.BufferGeometry | null = null;
    let ghostLineMat: THREE.LineBasicMaterial | null = null;
    let activeLineMat: THREE.LineBasicMaterial | null = null;
    let toolMat: THREE.MeshStandardMaterial | null = null;
    let toolHeadGeo: THREE.SphereGeometry | null = null;
    let ambientLight: THREE.AmbientLight | null = null;
    let pointLight: THREE.PointLight | null = null;
    let axesHelper: THREE.AxesHelper | null = null;
    let toolHead: THREE.Mesh | null = null;

    const positions: number[] = [];
    const commandToVertexIndex = new Int32Array(commands.length);
    let currentVertCount = 0;

    for (let i = 0; i < commands.length - 1; i++) {
      const c1 = commands[i];
      const c2 = commands[i + 1];
      commandToVertexIndex[i] = currentVertCount;

      if (c1.type === 'OTHER' || c2.type === 'OTHER') continue;

      const isZeroLen =
        Math.abs(c1.x - c2.x) < 0.0001 &&
        Math.abs(c1.y - c2.y) < 0.0001 &&
        Math.abs(c1.z - c2.z) < 0.0001;
      if (isZeroLen) continue;

      const isRapid = c2.type === 'G0';
      const isCut = c2.type === 'G1' || c2.type === 'G2' || c2.type === 'G3';
      if ((isRapid && !viewOptions.showRapid) || (isCut && !viewOptions.showCutting)) continue;

      positions.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
      currentVertCount += 2;
    }

    if (commands.length > 0) {
      commandToVertexIndex[commands.length - 1] = currentVertCount;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);

    const camera = new THREE.PerspectiveCamera(45, offscreenCanvas.width / offscreenCanvas.height, 0.1, 100000);

    if (miniCameraRef.current) {
      camera.position.copy(miniCameraRef.current.position);
      camera.quaternion.copy(miniCameraRef.current.quaternion);
      camera.up.copy(miniCameraRef.current.up);
    } else {
      const bounds = new THREE.Box3();
      let hasBounds = false;
      for (const cmd of commands) {
        if (cmd.type === 'OTHER') continue;
        bounds.expandByPoint(new THREE.Vector3(cmd.x, cmd.y, cmd.z));
        hasBounds = true;
      }

      if (hasBounds) {
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        const size = new THREE.Vector3();
        bounds.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 100;
        const distance = maxDim * 2;
        camera.position.set(center.x + distance, center.y - distance, center.z + distance * 0.8);
        camera.up.set(0, 0, 1);
        camera.lookAt(center);
      } else {
        camera.position.set(100, -100, 100);
        camera.up.set(0, 0, 1);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
      }
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: offscreenCanvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(1);
      renderer.setSize(offscreenCanvas.width, offscreenCanvas.height, false);
      renderer.setClearColor(theme.background, 1);

      const baseGeo = new THREE.BufferGeometry();
      baseGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      ghostGeo = baseGeo.clone();
      activeGeo = baseGeo.clone();
      ghostLineMat = new THREE.LineBasicMaterial({ color: theme.g1, opacity: 0.18, transparent: true, depthWrite: false });
      activeLineMat = new THREE.LineBasicMaterial({ color: theme.g1, opacity: 1, transparent: false });

      const ghostLine = new THREE.LineSegments(ghostGeo, ghostLineMat);
      const activeLine = new THREE.LineSegments(activeGeo, activeLineMat);
      scene.add(ghostLine);
      scene.add(activeLine);

      toolHeadGeo = new THREE.SphereGeometry(2.5, 20, 20);
      toolMat = new THREE.MeshStandardMaterial({ color: theme.text, emissive: theme.text, emissiveIntensity: 0.2 });
      toolHead = new THREE.Mesh(toolHeadGeo, toolMat);
      scene.add(toolHead);

      ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
      pointLight = new THREE.PointLight('#ffffff', 1);
      pointLight.position.set(100, 100, 120);
      axesHelper = new THREE.AxesHelper(100);
      scene.add(ambientLight, pointLight, axesHelper);

      setVideoExportState('rendering');
      setVideoExportProgress(0);

      const videoBlob = await renderVideoOffline({
        commands,
        initialSpeed: speedSliderVal,
        canvas: offscreenCanvas,
        miniCamera: miniCameraRef.current,
        onProgress: (progress) => {
          setVideoExportProgress(Math.max(0, Math.min(1, progress.progress)));
        },
        captureState: () => ({
          currentIndex,
          displayPos: displayPos.clone(),
          interpolatedPos: interpolatedPosRef.current.clone(),
          isPlaying,
          elapsedTime
        }),
        applyFrameState: (frame) => {
          const idx = Math.max(0, Math.min(commands.length - 1, frame.index));
          const c1 = commands[idx] || commands[commands.length - 1];
          const c2 = commands[Math.min(commands.length - 1, idx + 1)] || c1;
          const currentPos = new THREE.Vector3().lerpVectors(
            new THREE.Vector3(c1.x, c1.y, c1.z),
            new THREE.Vector3(c2.x, c2.y, c2.z),
            Math.max(0, Math.min(1, frame.progress))
          );

          interpolatedPosRef.current.copy(currentPos);
          setDisplayPos(currentPos.clone());
          setCurrentIndex(idx);

          if (toolHead) {
            toolHead.position.copy(currentPos);
          }

          if (activeGeo && ghostGeo) {
            const totalVerts = commandToVertexIndex[commands.length - 1] || 0;
            const drawLimit = commandToVertexIndex[idx] || 0;

            let extraVerts = 0;
            const nextCmd = commands[idx + 1];
            if (nextCmd) {
              const nextIsRapid = nextCmd.type === 'G0';
              const nextIsCut = nextCmd.type === 'G1' || nextCmd.type === 'G2' || nextCmd.type === 'G3';
              const visible = (nextIsRapid && viewOptions.showRapid) || (nextIsCut && viewOptions.showCutting);
              if (visible) {
                extraVerts = Math.round(Math.max(0, Math.min(1, frame.progress)) * 2);
              }
            }

            ghostGeo.setDrawRange(0, totalVerts);
            activeGeo.setDrawRange(0, Math.min(totalVerts, drawLimit + extraVerts));
          }
        },
        renderScene: () => {
          renderer?.render(scene, camera);
        },
        restoreState: (state) => {
          setIsPlaying(state.isPlaying);
          setCurrentIndex(state.currentIndex);
          setDisplayPos(state.displayPos.clone());
          interpolatedPosRef.current.copy(state.interpolatedPos);
          setElapsedTime(state.elapsedTime);
        }
      });

      setVideoExportState('uploading');

      const embedData = {
        content: '🎥 **GCODE SIMULATION VIDEO**',
        embeds: [{
          title: file?.name || 'simulation.gcode',
          color: 0x2563eb,
          fields: [
            { name: 'Playback Speed', value: `${speedSliderVal}`, inline: true },
            { name: 'Commands', value: `${commands.length}`, inline: true },
            { name: 'Duration', value: analysis.totalTime, inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(embedData));
      formData.append('file', videoBlob, 'simulation.webm');

      const uploadRes = await fetch('/api/discord-video', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const raw = await uploadRes.text();
        throw new Error(raw || `Upload failed with status ${uploadRes.status}`);
      }

      setVideoExportProgress(1);
      setVideoExportState('done');
      setTimeout(() => setVideoExportState('idle'), 3000);
    } catch (error) {
      console.error('[GCodeViewer] Video export failed:', error);
      setVideoExportState('error');
      setVideoExportErrorMessageState(getVideoExportErrorMessage(error));
    } finally {
      if (renderer) {
        renderer.dispose();
      }
      if (videoPreviewRef.current) {
         videoPreviewRef.current.innerHTML = '';
      }
      if (activeGeo) activeGeo.dispose();
      if (ghostGeo) ghostGeo.dispose();
      if (ghostLineMat) ghostLineMat.dispose();
      if (activeLineMat) activeLineMat.dispose();
      if (toolHeadGeo) toolHeadGeo.dispose();
      if (toolMat) toolMat.dispose();
      offscreenCanvas.width = 0;
      offscreenCanvas.height = 0;
    }
  }, [
    videoExportState,
    analysis,
    commands,
    speedSliderVal,
    currentIndex,
    displayPos,
    isPlaying,
    elapsedTime,
    viewOptions.showRapid,
    viewOptions.showCutting,
    theme.background,
    theme.g1,
    theme.text,
    file
  ]);

  useEffect(() => localStorage.setItem('vjp26_gc_speed', JSON.stringify(speedSliderVal)), [speedSliderVal]);
  useEffect(() => localStorage.setItem('vjp26_gc_grid', JSON.stringify(showGrid)), [showGrid]);
  useEffect(() => localStorage.setItem('vjp26_gc_theme', JSON.stringify(theme)), [theme]);
  useEffect(() => localStorage.setItem('vjp26_gc_tool', JSON.stringify(toolConfig)), [toolConfig]);
  useEffect(() => localStorage.setItem('vjp26_gc_viewmode', JSON.stringify(viewMode)), [viewMode]);
  useEffect(() => localStorage.setItem('vjp26_gc_starmode', JSON.stringify(starMode)), [starMode]);
  useEffect(() => localStorage.setItem('vjp26_gc_options', JSON.stringify(viewOptions)), [viewOptions]);
  useEffect(() => {
    setTimeout(async () => {
        const getGpuGL = (pref: WebGLPowerPreference) => {
            try {
                const canvas = document.createElement('canvas'); 
                const options = pref === 'default' ? {} : { 
                    powerPreference: pref,
                    failIfMajorPerformanceCaveat: pref === 'high-performance'
                };
                const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options); 
                if (gl) { 
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); 
                    if (debugInfo) { 
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); 
                        return renderer ? renderer.replace(/ANGLE \((.*)\)/, '$1').split(' Direct3D')[0] : 'Unknown';
                    } 
                }
                return 'Cannot initialize GPU';
            } catch(e) { return 'Error'; }
        };

        let currentGpu = getGpuGL(gpuPreference);
        
        if (navigator.gpu) {
            try {
                const adapter = await navigator.gpu.requestAdapter({ powerPreference: gpuPreference === 'default' ? undefined : gpuPreference });
                if (adapter && adapter.info && adapter.info.device) {
                    currentGpu = adapter.info.device + ' (WebGPU)';
                }
            } catch(e) {}
        }
        
        setGpuName(currentGpu);
    }, 100);
}, [gpuPreference]);
  const playbackSpeed = useMemo(() => { if (speedSliderVal <= 40) return 0.1 + (speedSliderVal / 40) * 1.9; const t = (speedSliderVal - 40) / 60; return 2 + Math.pow(t, 3) * 500; }, [speedSliderVal]);
  useEffect(() => { const handleResize = () => setZoomFitTrigger(prev => prev + 1); window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);
  const simState = useRef({ index: 0, progress: 0, lastTime: 0 });
  useEffect(() => { if (!isPlaying) { simState.current.index = currentIndex; simState.current.progress = 0; if (commands[currentIndex]) { const c = commands[currentIndex]; const p = new THREE.Vector3(c.x, c.y, c.z); interpolatedPosRef.current.copy(p); setDisplayPos(p); } } }, [currentIndex, isPlaying, commands]);
  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId: number;
    simState.current.lastTime = performance.now();
    const animate = (time: number) => {
      const delta = (time - simState.current.lastTime) / 1000;
      simState.current.lastTime = time;
      if (delta > 0.1) { animationFrameId = requestAnimationFrame(animate); return; }
      const res = advanceMotion(simState.current, commands, delta, playbackSpeed);
      
      simState.current.index = res.newIndex;
      simState.current.progress = res.newProgress;
      
      if (res.elapsedDelta > 0) {
        setElapsedTime(t => t + res.elapsedDelta);
      }
      
      if (res.isFinished) {
        interpolatedPosRef.current.copy(res.position);
        setDisplayPos(res.position);
        setCurrentIndex(res.newIndex);
        setIsPlaying(false);
      } else {
        interpolatedPosRef.current.copy(res.position);
        setDisplayPos(res.position);
        setCurrentIndex(res.newIndex);
      }

      if (!res.isFinished) animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, commands, playbackSpeed]);

  const currentCmd = useMemo(() => commands[currentIndex] || { line: 0, type: 'OTHER' as const, x: 0, y: 0, z: 0, code: '', f: 0, s: 0 }, [commands, currentIndex]);
  const toggleFullScreen = () => {
    setShowBorderFlash(true);
    setTimeout(() => setShowBorderFlash(false), 2500);

    if (!is3DFullScreen) {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const targetY = rect.top + window.pageYOffset;
        const yOffset = -65;
        fluidScroll(targetY + yOffset, 1200);
        setTimeout(() => {
          document.body.style.overflow = 'hidden';
          setIs3DFullScreen(true);
          setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
        }, 1300);
      }
    } else {
      document.body.style.overflow = 'auto';
      fluidScroll(0, 1000);
      setIs3DFullScreen(false);
      setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
    }
  };

  const fluidScroll = (targetY: number, duration: number = 1000) => {
    const startY = window.pageYOffset;
    const difference = targetY - startY;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      const easing = progress < 0.5 
        ? 8 * progress * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 4) / 2;

      window.scrollTo(0, startY + difference * easing);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  const handleWorkspaceLock = () => {
    setShowBorderFlash(true);
    setTimeout(() => setShowBorderFlash(false), 2500); 

    if (!isWorkspaceLocked) {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const targetY = rect.top + window.pageYOffset;
        const yOffset = -65;
        
        fluidScroll(targetY + yOffset, 1200);
        
        setTimeout(() => {
          setIsWorkspaceLocked(true);
          setZoomFitTrigger(p => p + 1);
        }, 1300);
      }
    } else {
      document.body.style.overflow = 'auto';
      fluidScroll(0, 1000); 
      setIsWorkspaceLocked(false);
      setTimeout(() => setZoomFitTrigger(p => p + 1), 300);
    }
  };
  
  useEffect(() => {
    if (isWorkspaceLocked) { document.body.style.overflow = 'hidden';
      
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isWorkspaceLocked]);
  const handleJumpToLine = () => { const line = parseInt(jumpTarget); if (!isNaN(line) && line >= 1 && line <= commands.length) { setCurrentIndex(line - 1); setShowJumpInput(false); setJumpTarget(''); } };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile); setIsProcessing(true); setLoadingProgress(0); setCommands([]); setAnalysis(null);
        try {
            const result = await gcodeService.processFileAsync(selectedFile, p => setLoadingProgress(p));
            setCommands(result.commands); setAnalysis(result.analysis); setContent(result.rawText); setTempContent(result.rawText); setHistory([result.rawText]); setHistoryIndex(0);
            if (result.commands.length > 0) { const start = new THREE.Vector3(result.commands[0].x, result.commands[0].y, result.commands[0].z); interpolatedPosRef.current.copy(start); setDisplayPos(start); }
            setCurrentIndex(0); setIsPlaying(false); setMeasurePoints([]); setElapsedTime(0);
        } catch (error) { alert("Lỗi xử lý file: " + error); } finally { setIsProcessing(false); }
    }
    // Fixed: Reset value so same file can be uploaded again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  const handleOpenFilePicker = async () => {
     try {
         const [handle] = await (window as any).showOpenFilePicker({ types: [{ description: 'G-Code Files', accept: { 'text/plain': ['.gcode', '.nc', '.cnc', '.txt'] } }] });
         if (handle) {
             setFile(await handle.getFile()); setIsProcessing(true); setLoadingProgress(0); setCommands([]); 
             const result = await gcodeService.processFileAsync(handle, p => setLoadingProgress(p));
             setCommands(result.commands); setAnalysis(result.analysis); setContent(result.rawText); setTempContent(result.rawText); setHistory([result.rawText]); setHistoryIndex(0);
             if (result.commands.length > 0) { const start = new THREE.Vector3(result.commands[0].x, result.commands[0].y, result.commands[0].z); interpolatedPosRef.current.copy(start); setDisplayPos(start); }
             setCurrentIndex(0); setIsPlaying(false); setIsProcessing(false);
         }
     } catch (err) { console.log(err); }
  };
  const handleAIAnalyze = async () => {
    if (!content || isAnalyzing) return;
    setIsAnalyzing(true); setAiAnalysis('');
    try {
        const ai = new GoogleGenAI({ apiKey: localStorage.getItem('vjp26_api_key') || process.env.API_KEY || 'dummy' });
        const report = analysis || gcodeService.analyze(commands);
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Phân tích đoạn mã G-Code CNC này và đưa ra nhận xét chuyên môn ngắn gọn (dưới 100 từ) về độ an toàn và hiệu quả.\n\nThông số kỹ thuật:\n- Tổng thời gian: ${report.totalTime}\n- Kích thước phôi: ${report.maxX - report.minX}x${report.maxY - report.minY}x${report.maxZ - report.minZ} mm\n- Số lần thay dao: ${report.toolChanges}\n- Cảnh báo va chạm: ${report.collisionWarnings.length}\n\nMã G-Code (50 dòng đầu):\n${content.substring(0, 1000)}...` });
        setAiAnalysis(response.text || "Không có phản hồi");
    } catch (error) { setAiAnalysis("Lỗi kết nối AI: " + (error as any).message); } finally { setIsAnalyzing(false); }
  };
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value; setTempContent(newText);
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    historyTimeoutRef.current = setTimeout(() => { if (!isUndoRedoAction.current) { const newHistory = history.slice(0, historyIndex + 1); newHistory.push(newText); if (newHistory.length > 50) newHistory.shift(); setHistory(newHistory); setHistoryIndex(newHistory.length - 1); } isUndoRedoAction.current = false; }, 500);
  };
  const handleFindNext = () => {
    if (!findText || !textAreaRef.current) return;
    const start = textAreaRef.current.selectionStart + 1, searchVal = matchCase ? findText : findText.toLowerCase(), textVal = matchCase ? tempContent : tempContent.toLowerCase();
    let idx = textVal.indexOf(searchVal, start);
    if (idx === -1 && wrapAround) idx = textVal.indexOf(searchVal, 0);
    if (idx !== -1) { textAreaRef.current.setSelectionRange(idx, idx + findText.length); textAreaRef.current.focus(); const lines = textAreaRef.current.value.substr(0, idx).split("\n").length; textAreaRef.current.scrollTop = (lines * 20) - (textAreaRef.current.clientHeight / 2); }
  };

  const handleSegmentClick = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  }, []);

  const handleLineClick = useCallback((lineIndex: number) => {
      // lineIndex is 0-based index from full file content
      setIsPlaying(false);
      
      // We need to find the command that corresponds to line number (lineIndex + 1)
      const targetLineNumber = lineIndex + 1;
      
      const cmdIndex = commands.findIndex(c => c.line === targetLineNumber);
      
      if (cmdIndex !== -1) {
          setCurrentIndex(cmdIndex);
      } else {
          // If the clicked line is a comment or empty (not in commands), find nearest preceding command
          let found = -1;
          for (let l = targetLineNumber; l >= 1; l--) {
              found = commands.findIndex(c => c.line === l);
              if (found !== -1) break;
          }
          // If not found backwards, look forwards?
          if (found === -1) {
               for (let l = targetLineNumber; l <= (commands[commands.length-1]?.line || 0) + 100; l++) {
                  found = commands.findIndex(c => c.line === l);
                  if (found !== -1) break;
               }
          }

          if (found !== -1) setCurrentIndex(found);
      }
  }, [commands]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setTempContent(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setTempContent(history[nextIndex]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      setTempContent(value.substring(0, start) + "  " + value.substring(end));
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    }
  };

  
  
  const ToolbarButton = ({ icon, label, color = "text-gray-400", active, onClick, disabled }: any) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`toolbar-button flex flex-col items-center justify-center p-0.5 rounded border min-w-[38px] transition-all
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
        ${active ? 'bg-slate-600 border-slate-400 shadow-inner' : 'border-transparent hover:bg-slate-600 hover:border-slate-500 active:bg-slate-700'}`}
    >
      <span className={`toolbar-button-icon text-2xl mb-0.5 ${color} w-6 h-6 flex items-center justify-center`}>
        {icon}
      </span>
      <span className="text-[8px] text-center leading-tight whitespace-pre-line text-gray-300">{label}</span>
    </button>
  );

  const renderToolbarButtons = () => (
    <div className="flex h-full items-start px-1 space-x-0.5 pt-1 w-full justify-start min-w-max">
        <div className="flex flex-col h-full border-r border-slate-600 px-1">
            <div className="flex space-x-0.5 items-center mb-1 flex-1">
                <ToolbarButton icon={<Upload size={20} />} label={`Import\nFile`} color="text-green-400" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".nc,.ngc,.gcode,.tap,.txt"
                  className="hidden"
                />

                <ToolbarButton icon={<HardDrive size={20} />} label={`Local\nAccess`} color="text-blue-400" onClick={handleOpenFilePicker} disabled={isProcessing} />

                <div className="ml-2 flex flex-col justify-center min-w-[120px] max-w-[200px]">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{file ? "G-CODE" : "NO FILE"}</span>
                    <span className="text-xs text-white font-bold truncate flex items-center justify-between">
                        {file ? file.name : "Tải lên tệp .nc/.gcode"}
                        {file && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setFile(null); setContent(''); setCommands([]); setAnalysis(null); setIsPlaying(false); }}
                             className="hover:text-red-400 text-slate-500 ml-2"
                             title="Xóa file"
                           >
                             <X size={12} />
                           </button>
                        )}
                    </span>
                </div>
            </div>
            <div className="text-center text-[8px] text-gray-500 -mt-1">File Operations</div>
        </div>

        <div className="flex flex-col h-full border-r border-slate-600 px-1">
            <div className="flex space-x-0.5 flex-1">
                <ToolbarButton icon={isLiteMode ? <Zap size={18} className="fill-amber-400" /> : <Gauge size={18} />} label={`Lite\nMode`} color={isLiteMode ? "text-amber-400" : "text-gray-400"} active={isLiteMode} onClick={() => setIsLiteMode(!isLiteMode)} />
                <div className="relative">
                    <div className="relative group flex flex-col items-center">
                    <ToolbarButton icon={<Monitor size={18} />} label={`GPU\nMode`} color={showGpuMenu ? "text-red-400" : "text-gray-400"} active={showGpuMenu} onClick={() => setShowGpuMenu(!showGpuMenu)} />
                    <div className="absolute -bottom-2 whitespace-nowrap text-[6px] text-emerald-400 font-mono scale-75 opacity-70 max-w-[50px] overflow-hidden text-ellipsis pointer-events-none">{gpuName.replace(/ANGLE \((.*)\)/, '$1').split(' ')[0]}</div>
                </div>
                    {showGpuMenu && <div className="absolute top-[56px] left-0 bg-slate-900 border border-white/10 rounded p-2 w-48 shadow-2xl z-[9999] flex flex-col gap-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1 flex justify-between items-center"><span>Cấu hình Card đồ họa</span><button onClick={() => setShowGpuMenu(false)}><X size={12} className="text-slate-500 hover:text-white" /></button></div>
                        <button onClick={() => { setGpuPreference('high-performance'); setShowGpuMenu(false); }} className={`text-left px-2 py-1.5 rounded text-[10px] ${gpuPreference === 'high-performance' ? 'bg-red-500/20 text-red-400 font-bold' : 'hover:bg-white/5 text-slate-300'} flex flex-col`}>
                            <span>Hiệu năng cao (Card rời)</span>
                            <span className="text-[8px] opacity-70 font-mono mt-0.5">{detectedGpus.high}</span>
                        </button>
                        <button onClick={() => { setGpuPreference('low-power'); setShowGpuMenu(false); }} className={`text-left px-2 py-1.5 rounded text-[10px] ${gpuPreference === 'low-power' ? 'bg-green-500/20 text-green-400 font-bold' : 'hover:bg-white/5 text-slate-300'} flex flex-col`}>
                            <span>Tiết kiệm điện (Card Onboard)</span>
                            <span className="text-[8px] opacity-70 font-mono mt-0.5">{detectedGpus.low}</span>
                        </button>
                        <button onClick={() => { setGpuPreference('default'); setShowGpuMenu(false); }} className={`text-left px-2 py-1.5 rounded text-[10px] ${gpuPreference === 'default' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'hover:bg-white/5 text-slate-300'}`}>Mặc định của hệ điều hành</button>
                        <div className="text-[8px] text-slate-500 mt-1 italic">* Ứng dụng sẽ tải lại trang để áp dụng GPU mới. (Lưu ý: Một số trình duyệt tự ép dùng 1 card duy nhất)</div>
                    </div>}
                </div>
                <ToolbarButton icon={showGrid ? <Eye size={18} /> : <EyeOff size={18} />} label={`Show\nGrid`} color={showGrid ? "text-blue-400" : "text-gray-400"} active={showGrid} onClick={() => setShowGrid(!showGrid)} />
                <ToolbarButton icon={<Focus size={18} />} label={`Auto\nFit`} onClick={() => setZoomFitTrigger(p => p + 1)} />
                <ToolbarButton icon={isWorkspaceLocked ? <Minimize size={18} /> : <Maximize size={18} />} label={`Full\nScreen(1)`} color={isWorkspaceLocked ? "text-blue-400" : "text-gray-400"} onClick={handleWorkspaceLock} />
            </div>
            <div className="text-center text-[8px] text-gray-500 mb-1">View Options</div>
        </div>

        <div className="flex flex-col h-full border-r border-slate-600 px-1">
            <div className="flex space-x-0.5 flex-1 relative">
                <div className="relative">
                    <ToolbarButton icon={<Sparkles size={18} />} label={`View\nStar`} color={showStarMenu ? "text-purple-400" : "text-gray-400"} active={showStarMenu} onClick={() => setShowStarMenu(!showStarMenu)} />
                    {showStarMenu && <div className="absolute top-[56px] right-0 bg-slate-900 border border-white/10 rounded p-2 w-48 shadow-2xl z-[9999]"><div className="text-[10px] font-black uppercase text-slate-500 mb-1">KIỂU SAO</div>{Object.entries(StarMode).map(([key, label]) => { const mode = StarMode[key as keyof typeof StarMode]; return (<button key={key} onClick={() => { setStarMode(mode); setShowStarMenu(false); }} className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2 ${starMode === mode ? 'bg-purple-600/20 text-purple-400' : 'hover:bg-white/5 text-slate-300'}`}>{label}</button>); })}</div>}
                </div>
                <div className="relative">
                    <ToolbarButton icon={<ListFilter size={18} />} label={`Sim\nMode`} color={showViewModeMenu ? "text-blue-400" : "text-gray-400"} active={showViewModeMenu} onClick={() => setShowViewModeMenu(!showViewModeMenu)} />
                    {showViewModeMenu && <div className="absolute top-[56px] right-0 bg-slate-900 border border-white/10 rounded p-2 w-48 shadow-2xl z-[9999]"><div className="text-[10px] font-black uppercase text-slate-500 mb-1">MÔ PHỎNG</div>{Object.values(ViewMode).map(mode => (<button key={mode} onClick={() => { setViewMode(mode); setShowViewModeMenu(false); }} className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2 ${viewMode === mode ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-300'}`}><div className={`w-1.5 h-1.5 rounded-full ${viewMode === mode ? 'bg-blue-500' : 'bg-slate-700'}`} />{mode}</button>))}</div>}
                </div>
                <div className="relative">
                    <ToolbarButton icon={<MoreHorizontal size={18} />} label={`View\nOptions`} color={showViewOptionsMenu ? "text-blue-400" : "text-gray-400"} active={showViewOptionsMenu} onClick={() => setShowViewOptionsMenu(!showViewOptionsMenu)} />
                    {showViewOptionsMenu && <div className="absolute top-[56px] right-0 bg-slate-900 border border-white/10 rounded p-2 w-56 shadow-2xl z-[9999]"><div className="text-[10px] font-black uppercase text-slate-500 mb-1">TÙY CHỌN</div>{[{ key: 'showToolpath', label: 'Hiện đường dao' }, { key: 'showPoints', label: 'Hiện các điểm' }, { key: 'showRapid', label: 'Hiện đường G0' }, { key: 'showCutting', label: 'Hiện G1/G2/G3' }, { key: 'highlightArcs', label: 'Tô màu cung' }, { key: 'highlightElement', label: 'Highlight Hover' }, { key: 'largePoints', label: 'Điểm to hơn' }].map(opt => (<button key={opt.key} onClick={() => setViewOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key as keyof ViewOptions] }))} className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-all flex items-center justify-between ${viewOptions[opt.key as keyof ViewOptions] ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'}`}><span>{opt.label}</span>{viewOptions[opt.key as keyof ViewOptions] && <Check size={12} />}</button>))}</div>}
                </div>
                <div className="relative">
                    <ToolbarButton icon={<Wrench size={18} />} label={`Tool\nConfig`} color={showToolConfig ? "text-emerald-400" : "text-gray-400"} active={showToolConfig} onClick={() => setShowToolConfig(!showToolConfig)} />
                    {showToolConfig && <div className="absolute top-[56px] right-0 bg-slate-900 border border-white/10 rounded p-3 w-56 shadow-2xl z-[9999]"><div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black uppercase text-white">CẤU HÌNH DAO</span><button onClick={() => setShowToolConfig(false)}><X size={12} className="text-slate-500 hover:text-white" /></button></div><div className="space-y-2">{[{ l: 'Kính mũi', k: 'diameter' }, { l: 'Dài mũi', k: 'length' }, { l: 'Kính cán', k: 'holderDiameter' }, { l: 'Dài cán', k: 'holderLength' }].map(f => (<div key={f.k} className="flex justify-between items-center"><label className="text-[9px] font-black text-slate-500 uppercase">{f.l}</label><input type="number" value={toolConfig[f.k as keyof ToolConfig]} onChange={e => setToolConfig({ ...toolConfig, [f.k]: parseFloat(e.target.value) })} className="w-16 bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-blue-500 text-right" /></div>))}</div></div>}
                </div>
                <div className="relative">
                    <ToolbarButton icon={<Palette size={18} />} label={`Color\nTheme`} color={showThemeSettings ? "text-indigo-400" : "text-gray-400"} active={showThemeSettings} onClick={() => setShowThemeSettings(!showThemeSettings)} />
                    {showThemeSettings && <div className="absolute top-[56px] right-0 bg-slate-900 border border-white/10 rounded p-3 w-64 shadow-2xl z-[9999]"><div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1"><span className="text-[10px] font-black uppercase text-white">MÀU SẮC</span><button onClick={() => setShowThemeSettings(false)} className="hover:text-white text-slate-500"><X size={12} /></button></div><div className="grid grid-cols-3 gap-1 mb-2"><button onClick={() => setTheme(DEFAULT_THEME)} className="bg-slate-800 hover:bg-slate-700 text-[8px] font-bold text-slate-300 py-1 rounded">MẶC ĐỊNH</button><button onClick={() => setTheme({ ...DEFAULT_THEME, background: '#ffffff', grid: '#e2e8f0', g0: '#ef4444', g1: '#0f172a', arc: '#3b82f6', text: '#000000' })} className="bg-slate-200 hover:bg-white text-[8px] font-bold text-black py-1 rounded">SÁNG</button><button onClick={() => setTheme({ ...DEFAULT_THEME, background: '#172554', grid: '#1e3a8a', g0: '#facc15', g1: '#60a5fa', arc: '#c084fc', text: '#dbeafe' })} className="bg-blue-950 hover:bg-blue-900 text-[8px] font-bold text-blue-200 py-1 rounded">BLUEPRINT</button></div><div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">{Object.entries(theme).map(([key, val]) => (<div key={key} className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase text-slate-400">{THEME_LABELS[key as keyof ThemeConfig]}</span><div className="flex items-center gap-1.5"><span className="text-[8px] font-mono text-slate-600">{val}</span><div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20"><input type="color" value={val} onChange={e => setTheme({ ...theme, [key]: e.target.value })} className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer p-0 border-0" /></div></div></div>))}</div></div>}
                </div>
            </div>
            <div className="text-center text-[8px] text-gray-500 mb-1">Sim & Config</div>
        </div>

        <div className="flex flex-col h-full border-r border-slate-600 px-1">
            <div className="flex space-x-0.5 flex-1">
                <ToolbarButton icon={<Ruler size={18} />} label={`Measure\nTool`} color={snapMode ? "text-orange-400" : "text-gray-400"} active={snapMode} onClick={() => { setSnapMode(!snapMode); setMeasurePoints([]); }} />
            </div>
            <div className="text-center text-[8px] text-gray-500 mb-1">Tools</div>
        </div>

        {!isLiteMode && (
            <div className="flex flex-col h-full px-1">
                <div className="flex space-x-0.5 flex-1">
                    <ToolbarButton icon={isAnalyzing ? <Activity size={18} className="animate-spin" /> : <Cpu size={18} />} label={`AI\nAnalyze`} color={isAnalyzing ? "text-purple-400" : "text-pink-400"} disabled={isAnalyzing || !content} onClick={handleAIAnalyze} />
                </div>
                <div className="text-center text-[8px] text-gray-500 mb-1">Analysis</div>
            </div>
        )}
    </div>
  );
  
  const ThreeDViewContent = (
      <>
          {is3DFullScreen && (
            <div className="absolute top-0 left-0 right-0 z-[9999] pointer-events-none">
              <div className="pointer-events-auto bg-[#2d2d2d] h-[67px] border-b border-[#3e3e3e] flex items-center justify-between px-2 select-none shadow-lg w-full relative z-[9999]">
                <div className="flex items-start h-full w-full overflow-visible rounded-xl pb-1">
                   {renderToolbarButtons()}
                </div>
              </div>
            </div>
          )}
          
          <div className={`absolute left-4 z-10 pointer-events-none hidden sm:block ${is3DFullScreen ? 'top-[83px]' : 'top-4'}`}><div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl"><div className="flex flex-col gap-1">{[{l:'X',c:'text-red-500',v:displayPos.x},{l:'Y',c:'text-green-500',v:displayPos.y},{l:'Z',c:'text-blue-500',v:displayPos.z}].map(a=>(<div key={a.l} className="flex items-baseline gap-4"><span className={`text-xl font-black ${a.c} w-6`}>{a.l}</span><span className="text-3xl font-mono font-bold tracking-wider" style={{ color: theme.text }}>{a.v.toFixed(3)}</span></div>))}<div className="h-px bg-white/10 my-3" /><div className="flex justify-between items-center text-xs font-mono text-slate-400"><div className="flex gap-2">LỆNH: <span className="font-bold" style={{ color: theme.text }}>{currentCmd.code.split(' ')[0]}</span></div><div className="flex gap-2 text-orange-400">F: <span className="font-bold">{currentCmd.f || 0}</span></div></div></div></div></div>
          {!isLiteMode && <div className="absolute bottom-4 left-4 z-10 pointer-events-none"><div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-2 flex flex-col gap-1 shadow-lg"><div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><HardDrive size={10} /><span>PHẦN CỨNG ({cpuThreads} THREADS)</span></div><div className="text-[10px] font-mono text-emerald-400 truncate max-w-[200px]" title={gpuName}>{gpuName.replace(/ANGLE \((.*)\)/, '$1')}</div></div></div>}
          
          {/* Cảnh báo Windows chặn GPU */}
          <AnimatePresence>
            {showGpuWarning && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div initial={{scale: 0.9, y: 20}} animate={{scale: 1, y: 0}} className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-lg shadow-2xl relative">
                        <button onClick={() => setShowGpuWarning(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 text-red-500 rounded-full"><AlertCircle size={32} /></div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">PHÁT HIỆN CHƯA KÍCH HOẠT CARD RỜI!</h3>
                                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                                    Hệ thống quét thấy trình duyệt của bạn đang bị khóa ở Card Onboard <strong>({gpuName})</strong>. Để Nesting 3D mượt nhất, bạn cần mở khóa sức mạnh Card Rời (RTX/AMD).
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowGpuWarning(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-bold transition-all">Bỏ qua</button>
                                    <button onClick={handleAutoFixGPU} disabled={isAutoFixingGpu} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black transition-all flex items-center gap-2">
                                        {isAutoFixingGpu ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
                                        {isAutoFixingGpu ? 'Đang kích hoạt...' : 'KÍCH HOẠT TỰ ĐỘNG NGAY'}
                                    </button>
                                </div>
                                {isAutoFixingGpu && <p className="text-[10px] text-red-400 mt-2 font-mono text-right animate-pulse">Trình duyệt sẽ tự động khởi động lại sau 1 giây...</p>}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>{isProcessing && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center"><Loader2 size={48} className="text-blue-500 animate-spin mb-4" /><h3 className="text-white font-black uppercase tracking-widest text-lg">ĐANG XỬ LÝ DỮ LIỆU</h3><div className="w-64 h-2 bg-slate-800 rounded-full mt-4 overflow-hidden border border-white/10"><motion.div className="h-full bg-blue-500" initial={{width:0}} animate={{width:`${loadingProgress}%`}} /></div><span className="text-blue-400 font-mono text-sm mt-2">{loadingProgress.toFixed(1)}%</span></motion.div>}</AnimatePresence>
          
          <Canvas key={gpuPreference} camera={{ position: [100, -100, 100], fov: 45, far: 100000, near: 0.1 }} dpr={isLiteMode ? 1 : [1, 2]} gl={{ powerPreference: gpuPreference, antialias: !isLiteMode, stencil: false, depth: true }}><color attach="background" args={[theme.background]} />
            <SceneContent 
                commands={commands} currentCmd={currentCmd} interpolatedPosRef={interpolatedPosRef} theme={theme} toolConfig={toolConfig} showGrid={showGrid} snapMode={snapMode} measurePoints={measurePoints} setMeasurePoints={setMeasurePoints} currentIndex={currentIndex} viewMode={viewMode} viewOptions={viewOptions} starMode={starMode} zoomFitTrigger={zoomFitTrigger} onSegmentClick={handleSegmentClick} isLiteMode={isLiteMode} 
                viewCubeControllerRef={viewCubeControllerRef}
            />
          </Canvas>

          {!isLiteMode && (
             <ViewCubeUI 
                onSetView={(v) => viewCubeControllerRef.current?.setView(v)}
                onRotate={() => viewCubeControllerRef.current?.rotate90()}
             />
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl z-[9999] w-[95%] max-w-lg pointer-events-auto">
             <div className="flex items-center gap-4">
                 <button onClick={() => { setCurrentIndex(0); setElapsedTime(0); }} className="p-3 md:p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><RotateCcw size={16} /></button>
                 <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-lg active:scale-95">{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
                 <div className="flex-1 flex flex-col gap-1"><input type="range" min="0" max={Math.max(0, commands.length - 1)} value={currentIndex} onChange={e => { setIsPlaying(false); setCurrentIndex(parseInt(e.target.value)); setElapsedTime(0); }} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" /><div className="flex justify-between text-[9px] font-black uppercase text-slate-500"><span>BẮT ĐẦU</span><span>DÒNG {commands.length > 0 ? currentIndex + 1 : 0} / {commands.length}</span><span>KẾT THÚC</span></div></div>
             </div>
             <div className="flex items-center gap-3 pt-2 border-t border-white/5 relative"><span className="text-[9px] font-black text-slate-500 uppercase w-12">TỐC ĐỘ</span><input type="number" min="0" max="100" step="1" value={speedSliderVal} onChange={e => { let val = parseFloat(e.target.value); if(isNaN(val)) return; if(val<0) val=0; if(val>100) val=100; setSpeedSliderVal(val); }} className="w-16 bg-slate-200 border border-slate-400 rounded px-1 text-center text-black font-bold outline-none focus:border-purple-500 focus:bg-white text-[10px]" /><div className="bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold w-12 text-center">x{playbackSpeed.toFixed(1)}</div><div className="h-4 w-px bg-white/10 mx-2"></div><div className="relative"><button onClick={() => setShowJumpInput(!showJumpInput)} className={`p-1.5 rounded-lg transition-all ${showJumpInput ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="Đi tới dòng lệnh"><FastForward size={14} /></button>{showJumpInput && <div className="absolute bottom-10 right-0 bg-slate-900 border border-white/10 p-2 rounded-xl shadow-xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-2 duration-200"><input autoFocus type="number" value={jumpTarget} onChange={e => setJumpTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJumpToLine()} placeholder="Line #" className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono" /><button onClick={handleJumpToLine} className="bg-blue-600 text-white p-1 rounded-lg hover:bg-blue-500"><CornerDownRight size={14} /></button></div>}</div></div>
          </div>
          
          <button onClick={toggleFullScreen} className={`absolute right-4 z-[10000] p-2.5 ${is3DFullScreen ? "top-[80px] bg-blue-600/20 text-blue-400 border-blue-500/50" : "top-4 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white/10"} rounded-xl transition-all active:scale-95 border shadow-xl`} title={is3DFullScreen ? "Thu nhỏ 3D" : "Phóng to 3D (2)"}>{is3DFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>

          <AnimatePresence>{snapMode && <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="absolute top-24 right-4 sm:top-16 sm:right-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 pointer-events-none"><Ruler size={14} /> CHẾ ĐỘ ĐO ĐANG BẬT</motion.div>}</AnimatePresence>
      </>
  );

  return (
    <div ref={workspaceRef} className={`flex flex-col gap-0 w-full  ${isWorkspaceLocked ? 'fixed inset-0 z-[9999] bg-[#0f1419] h-screen' : 'h-[calc(100vh-140px)] min-h-[900px]'}`}>
      <AnimatePresence>
        {showBorderFlash && createPortal(
          <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 99999}}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.15, 0.1, 0] }} transition={{ duration: 2.5, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }} className="fixed inset-0 bg-cyan-500/10 z-[99998] pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut" }} className="fixed left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[99999] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[99999] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ height: 0, top: 0, opacity: 0 }} animate={{ height: ['0%', '100%', '100%', '100%'], opacity: [0, 1, 1, 0], boxShadow: ['0 0 8px #22d3ee', '0 0 20px #22d3ee', '0 0 20px #22d3ee', '0 0 0px #22d3ee'] }} transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut", delay: 0.15 }} className="fixed right-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[99999] mix-blend-screen pointer-events-none" />
            <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: [0, 1, 0] }} transition={{ duration: 2.5, times: [0, 0.3, 1], ease: "circOut", delay: 0.3 }} className="fixed left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-[99999] shadow-[0_0_20px_#22d3ee] pointer-events-none" style={{ transformOrigin: 'left' }} />
          </div>,
          document.body
        )}
      </AnimatePresence>
      {!is3DFullScreen && (
        <header className="h-[67px] shrink-0 bg-[#2d2d2d] border-b border-[#3e3e3e] flex items-center justify-between px-2 select-none shadow-lg w-full relative z-[9999]">
          <div className="flex items-start h-full w-full rounded-xl overflow-visible">
              {renderToolbarButtons()}
          </div>
        </header>
      )}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1 bg-[#25252b] p-1 w-full rounded-b-xl border border-t-0 border-black/50 overflow-hidden"> 
        {showEditor && (
            <div className="col-span-1 lg:col-span-3 bg-[#1e1e24] rounded flex flex-col overflow-hidden shadow-inner border border-black/40 relative z-0 h-96 lg:h-full order-2 lg:order-1">
            <div className="p-3 bg-slate-900 border-b border-white/5 flex items-center justify-between"><div className="flex items-center gap-2"><Code size={14} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isEditMode ? "CHẾ ĐỘ SỬA" : "XEM MÃ GCODE"}</span></div><div className="flex items-center gap-2">
                <button onClick={() => setShowCodeText(!showCodeText)} className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${!showCodeText ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title={showCodeText ? "Ẩn mã G-Code" : "Hiện mã G-Code"}>{showCodeText ? <EyeOff size={14} /> : <Eye size={14} />} <span>{showCodeText ? "ẨN MÃ" : "HIỆN MÃ"}</span></button>
                {isEditMode && (<><button onClick={handleUndo} disabled={historyIndex <= 0} className={`p-1.5 rounded-lg transition-all ${historyIndex > 0 ? 'bg-slate-800 text-slate-400 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`} title="Undo"><Undo2 size={14} /></button><button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className={`p-1.5 rounded-lg transition-all ${historyIndex < history.length - 1 ? 'bg-slate-800 text-slate-400 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`} title="Redo"><Redo2 size={14} /></button><div className="w-px h-4 bg-white/10 mx-1"></div><button onClick={() => setShowReplace(!showReplace)} className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-all ${showReplace ? 'bg-orange-600/20 text-orange-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`} title="Replace"><Replace size={14} /></button></>)}<button onClick={() => { if (isEditMode) {  setContent(tempContent);  /* Trigger parsing manually */  const parseManualGCode = async () => {     setIsProcessing(true);     setLoadingProgress(0);     try {       const blob = new Blob([tempContent], { type: 'text/plain' });       const fakeFile = new File([blob], 'manual-edit.gcode', { type: 'text/plain' });       const result = await gcodeService.processFileAsync(fakeFile, p => setLoadingProgress(p));              setCommands(result.commands);       setAnalysis(result.analysis);       setContent(result.rawText);       setHistory([result.rawText]);       setHistoryIndex(0);              if (result.commands && result.commands.length > 0) {           const start = new THREE.Vector3(result.commands[0].x, result.commands[0].y, result.commands[0].z);           interpolatedPosRef.current.copy(start);           setDisplayPos(start);       }              setCurrentIndex(0);
       setIsPlaying(false);
       setMeasurePoints([]);
       setElapsedTime(0);
       setFile(fakeFile as any);
       setZoomFitTrigger(prev => prev + 1);
       alert("Đã cập nhật và biên dịch mã GCode");     } catch (e: any) {          console.error(e);          alert("Lỗi khi biên dịch GCode: " + e.message);      } finally {          setIsProcessing(false);      }    };    parseManualGCode();  } else {    setTempContent(content);  }  setIsEditMode(!isEditMode);  }} className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg transition-all ${isEditMode ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{isEditMode ? <span className="flex items-center gap-1"><Save size={10} /> LƯU</span> : "SỬA"}</button>
                <button onClick={() => setShowEditor(false)} className="bg-slate-800 text-slate-500 p-1.5 rounded-lg hover:text-white" title="Đóng khung"><PanelLeftClose size={14} /></button>
            </div></div>
            {isEditMode && showReplace && (<div className="p-3 bg-slate-900/95 border-b border-white/5 flex flex-col gap-3 animate-in slide-in-from-top-2"><div className="grid grid-cols-[auto_1fr] gap-2 items-center"><span className="text-[9px] font-black uppercase text-slate-500 text-right w-12">Find</span><div className="relative"><input value={findText} onChange={e => setFindText(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" placeholder="Find..." /></div><span className="text-[9px] font-black uppercase text-slate-500 text-right w-12">Rep</span><input value={replaceText} onChange={e => setReplaceText(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none" placeholder="Replace..." /></div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><label className="flex items-center gap-1.5 cursor-pointer group"><input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} className="rounded bg-slate-700 border-white/10 w-3 h-3" /><span className="text-[9px] text-slate-400 group-hover:text-white">Case</span></label><label className="flex items-center gap-1.5 cursor-pointer group"><input type="checkbox" checked={wrapAround} onChange={e => setWrapAround(e.target.checked)} className="rounded bg-slate-700 border-white/10 w-3 h-3" /><span className="text-[9px] text-slate-400 group-hover:text-white">Wrap</span></label></div><div className="flex items-center gap-1"><button onClick={handleFindNext} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase">Next</button><button onClick={() => { if(!textAreaRef.current) return; const s = textAreaRef.current.selectionStart, e = textAreaRef.current.selectionEnd; if(s === e) { handleFindNext(); return; } setTempContent(tempContent.substring(0,s) + replaceText + tempContent.substring(e)); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase">Rep</button><button onClick={() => { if(!findText) return; setTempContent(tempContent.replace(new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi'), replaceText)); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase">All</button><button onClick={() => setShowReplace(false)} className="hover:bg-red-500/20 text-slate-500 hover:text-red-400 p-1 rounded"><X size={12} /></button></div></div></div>)}
            {showCodeText ? (
                isEditMode ? 
                <textarea ref={textAreaRef} className="flex-1 bg-[#0b1120] text-slate-300 font-mono text-xs p-4 outline-none resize-none overflow-y-auto custom-scrollbar" value={tempContent} onChange={handleContentChange} onKeyDown={handleKeyDown} spellCheck={false} /> 
                : 
                <VirtualCodeList content={content} activeLine={commands[currentIndex]?.line} onLineClick={handleLineClick} />
            ) : (
                <div className="flex-1 bg-[#0b1120] flex flex-col items-center justify-center text-slate-600 gap-2">
                    <Code size={32} />
                    <span className="font-black uppercase tracking-widest text-[10px]">NỘI DUNG ĐÃ ẨN</span>
                </div>
            )}
            </div>
        )}
        {!is3DFullScreen && <div className={`col-span-1 ${showEditor ? (isLiteMode ? 'lg:col-span-10' : 'lg:col-span-6') : (isLiteMode ? 'lg:col-span-12' : 'lg:col-span-9')} glass-panel rounded-2xl bg-black relative overflow-hidden border-blue-500/20 flex flex-col z-0 order-1 lg:order-2 h-[50vh] lg:h-full transition-all duration-300`}>{!showEditor && <button onClick={() => setShowEditor(true)} className="absolute top-4 left-20 z-20 bg-slate-900/90 p-2 px-4 rounded-xl text-slate-400 hover:text-white border border-white/10 flex items-center gap-2 shadow-xl"><PanelLeftOpen size={18} /><span className="text-[10px] font-black uppercase">HIỆN GCODE</span></button>}{ThreeDViewContent}</div>}
        {is3DFullScreen && createPortal(<div className="fixed inset-0 z-[9999] bg-black flex flex-col">{ThreeDViewContent}</div>, document.body)}
        {!isLiteMode && (
            <div className="col-span-1 lg:col-span-3 glass-panel rounded-2xl flex flex-col gap-4 border-white/5 p-4 overflow-hidden z-0 order-3 h-auto lg:h-full">
               <div className="bg-slate-900/50 rounded-xl border border-white/5 p-4 shrink-0"><div className="flex items-center justify-between mb-3 text-emerald-400"><div className="flex items-center gap-2"><Layers size={14} /><span className="text-xs font-black uppercase tracking-widest">THÔNG SỐ CẮT</span></div>{analysis && <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded text-[9px] font-black uppercase border border-emerald-500/20 animate-pulse"><Timer size={10} /> {analysis.totalTime}</div>}</div><div className="grid grid-cols-2 gap-2 text-xs">{[{l:'TỌA ĐỘ (X/Y/Z)',v:`${displayPos.x.toFixed(1)} / ${displayPos.y.toFixed(1)} / ${displayPos.z.toFixed(1)}`,c:'text-slate-300'},{l:'TỐC ĐỘ (FEED)',v:`${currentCmd.f || 0} mm/min`,c:'text-orange-400'},{l:'SPINDLE (S)',v:`${currentCmd.s || 0} RPM`,c:'text-blue-400'},{l:'QUÃNG ĐƯỜNG CẮT',v:`${analysis ? (analysis.totalCutDistance/1000).toFixed(2) : 0} m`,c:'text-emerald-400'}].map(i=>(<div key={i.l} className="bg-black/40 p-2 rounded-lg border border-white/5"><div className="text-slate-500 mb-1 font-bold text-[10px]">{i.l}</div><div className={`font-mono text-sm ${i.c}`}>{i.v}</div></div>))}<div className="col-span-2 bg-black/40 p-2 rounded-lg border border-white/5"><div className="text-slate-500 mb-1 font-bold text-[10px]">PHẠM VI BAO (BOUNDS)</div><div className="font-mono text-slate-400 text-[10px]">X: {analysis ? `${analysis.minX.toFixed(0)}~${analysis.maxX.toFixed(0)}` : '-'} | Y: {analysis ? `${analysis.minY.toFixed(0)}~${analysis.maxY.toFixed(0)}` : '-'}</div></div></div></div><div className="flex-1 bg-gradient-to-b from-purple-900/10 to-slate-900/50 rounded-xl border border-purple-500/20 p-4 flex flex-col relative overflow-hidden min-h-[200px]"><div className="flex items-center justify-between mb-3 text-purple-400 shrink-0"><div className="flex items-center gap-2"><Cpu size={14} className={isAnalyzing ? 'animate-pulse' : ''} /><span className="text-xs font-black uppercase tracking-widest">KẾT QUẢ PHÂN TÍCH</span></div>

{videoExportState === 'rendering' && (
    <div className="w-full mb-3 p-2 bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner flex flex-col items-center gap-1">
        <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative" ref={videoPreviewRef}>
            <Activity className="animate-spin text-slate-500 absolute" size={24} />
        </div>
        <div className="text-[9px] text-slate-400 font-mono tracking-widest mt-1 animate-pulse">LIVE PREVIEW</div>
    </div>
)}
<div className="flex flex-col items-center gap-1">
<button 
    onClick={handleVideoExport} 
    disabled={videoExportState === 'rendering' || videoExportState === 'uploading' || !analysis} 
    className={`${videoExportState === 'error' ? 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white' : videoExportState === 'done' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'} px-2 py-1.5 rounded-lg border flex items-center gap-1 transition-all`}
>
    {videoExportState === 'idle' && <><Share2 size={12} /> <span className="text-[10px] font-bold uppercase">Gửi Video</span></>}
    {videoExportState === 'rendering' && <><Activity size={12} className="animate-spin" /> <span className="text-[10px] font-bold uppercase">Đang tạo video ({Math.round(videoExportProgress * 100)}%)</span></>}
    {videoExportState === 'uploading' && <><Upload size={12} className="animate-pulse" /> <span className="text-[10px] font-bold uppercase">Đang tải lên Discord...</span></>}
    {videoExportState === 'done' && <><Check size={12} /> <span className="text-[10px] font-bold uppercase">Gửi thành công!</span></>}
    {videoExportState === 'error' && <><AlertCircle size={12} /> <span className="text-[10px] font-bold uppercase">Lỗi gửi báo cáo</span></>}
</button>
{videoExportState === 'error' && videoExportErrorMessageState && (
    <div className="text-red-400 text-[10px] mt-1 text-center max-w-[150px] leading-tight break-words">
        {videoExportErrorMessageState}
    </div>
)}
</div>
</div><div className="flex-1 overflow-y-auto text-sm text-slate-300 leading-relaxed font-mono custom-scrollbar">
{isAnalyzing ? (
    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
        <Activity className="animate-spin text-purple-500" size={24} />
        <span className="text-[9px] uppercase tracking-widest">ĐANG PHÂN TÍCH...</span>
    </div>
) : aiAnalysis ? (
    <div className="flex flex-col gap-4">
        <div className="whitespace-pre-wrap">{aiAnalysis}</div>
        <div className="bg-black/50 rounded-lg border border-white/10 p-2 overflow-hidden aspect-video relative flex items-center justify-center group mt-4">
            {!isPlaying ? (
                <button onClick={() => { simState.current.index = 0; simState.current.progress = 0; setCurrentIndex(0); setIsPlaying(true); }} className="absolute z-10 w-12 h-12 bg-blue-600/80 hover:bg-blue-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all group-hover:scale-110">
                    <Play size={20} className="ml-1" fill="currentColor" />
                </button>
            ) : (
                <button onClick={() => setIsPlaying(false)} className="absolute z-10 w-12 h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all group-hover:scale-110">
                    <Pause size={20} fill="currentColor" />
                </button>
            )}
            {isPlaying && (
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-[8px] font-mono text-green-400 flex items-center gap-1 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    PLAYING: {Math.floor((currentIndex / Math.max(1, commands.length)) * 100)}%
                </div>
            )}
            <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ pointerEvents: 'auto' }}>
                <Canvas 
                    camera={{ position: [50, -50, 50], fov: 45, far: 100000, near: 0.1 }} 
                    dpr={1} 
                    gl={{ powerPreference: 'low-power' }}
                >
                    <color attach="background" args={[theme.background]} />
                    <OrbitControls makeDefault />
                    <UpdateMiniCamera cameraRef={miniCameraRef} />
                    <SceneContent 
                        commands={commands} currentCmd={currentCmd} interpolatedPosRef={interpolatedPosRef} 
                        theme={theme} toolConfig={toolConfig} showGrid={false} snapMode={false} 
                        measurePoints={[]} setMeasurePoints={() => {}} currentIndex={currentIndex} 
                        viewMode={viewMode} viewOptions={viewOptions} starMode={StarMode.OFF} 
                        zoomFitTrigger={zoomFitTrigger} onSegmentClick={() => {}} isLiteMode={true} 
                    />
                </Canvas>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75 pointer-events-none" style={{ width: `${(currentIndex / Math.max(1, commands.length)) * 100}%` }}></div>
        </div>
    </div>
) : (
    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 text-center">
        <Zap size={24} />
        <span className="text-[9px] uppercase tracking-widest">NHẤN NÚT PHÂN TÍCH ĐỂ BẮT ĐẦU</span>
    </div>
)}
</div></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GCodeViewer;
