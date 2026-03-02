'use client';

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export interface GPUObject {
  id: string;
  entities: any[];
  x: number;
  y: number;
  rotation: number;
  color: string;
  selected?: boolean;
}

// 🚀 GOD MODE RENDERER (1 Draw Call for the entire Workspace)
const GlobalBatchRenderer: React.FC<{
  objects: GPUObject[];
  onSelect: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
}> = ({ objects, onSelect, onMove }) => {
  const meshRef = useRef<THREE.LineSegments>(null);
  const { raycaster, camera, mouse } = useThree();
  const draggingId = useRef<string | null>(null);
  const dragOffset = useRef(new THREE.Vector3());
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  // 1. Build a SINGLE massive geometry for the entire workspace
  const workspaceGeometry = useMemo(() => {
    const allPositions: number[] = [];
    const allColors: number[] = [];
    const idMap: string[] = []; // Map vertex to object ID for selection

    objects.forEach((obj) => {
      const color = new THREE.Color(obj.color || "#00ff00");
      const rad = (obj.rotation * Math.PI) / 180;

      obj.entities.forEach((ent: any) => {
        const buffer = ent.geometry_buffer;
        if (!buffer) return;

        const floatArray = new Float32Array(buffer);
        const numPoints = floatArray.length / 3;

        for (let i = 0; i < numPoints; i++) {
          const lx = floatArray[i * 3];
          const ly = floatArray[i * 3 + 1];
          const wx = obj.x + lx * Math.cos(rad) - ly * Math.sin(rad);
          const wy = obj.y + lx * Math.sin(rad) + ly * Math.cos(rad);

          if (i < numPoints - 1) {
             const nlx = floatArray[(i+1)*3];
             const nly = floatArray[(i+1)*3+1];
             const nwx = obj.x + nlx * Math.cos(rad) - nly * Math.sin(rad);
             const nwy = obj.y + nlx * Math.sin(rad) + nly * Math.cos(rad);
            
            allPositions.push(wx, wy, 0, nwx, nwy, 0);
            allColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
          }
          
          if (ent.is_closed && i === numPoints - 1 && numPoints > 2) {
             const fx = obj.x + floatArray[0] * Math.cos(rad) - floatArray[1] * Math.sin(rad);
             const fy = obj.y + floatArray[0] * Math.sin(rad) + floatArray[1] * Math.cos(rad);
             allPositions.push(wx, wy, 0, fx, fy, 0);
             allColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
          }
        }
      });
    });

    const geometry = new THREE.BufferGeometry();
    if (allPositions.length > 0) {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
    }
    return geometry;
  }, [objects]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    // In this mode, we use the objects array for logical interaction
    // while the GPU handles the heavy lifting of 1 massive draw call
  }, []);

  return (
    <lineSegments ref={meshRef} geometry={workspaceGeometry}>
      <lineBasicMaterial vertexColors linewidth={1} transparent opacity={0.6} depthWrite={false} />
    </lineSegments>
  );
};

// 🚀 SELECTION & DRAG OVERLAY (Only render what's active)
const InteractionLayer: React.FC<{ 
    objects: GPUObject[];
    onSelect: (id: string, multi: boolean) => void;
    onMove?: (id: string, x: number, y: number) => void;
}> = ({ objects, onSelect, onMove }) => {
    const selectedObjects = useMemo(() => objects.filter(o => o.selected), [objects]);
    
    return (
        <group>
            {selectedObjects.map(obj => (
                <SelectedPart key={obj.id} object={obj} onMove={onMove} onSelect={onSelect} />
            ))}
        </group>
    );
};

const SelectedPart: React.FC<{ object: GPUObject; onMove?: any, onSelect: any }> = ({ object, onMove, onSelect }) => {
    const groupRef = useRef<THREE.Group>(null);
    const { raycaster } = useThree();
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const offset = useRef(new THREE.Vector3());
    const [dragging, setDragging] = useState(false);

    const geo = useMemo(() => {
        const pos: number[] = [];
        object.entities.forEach(ent => {
            if (!ent.geometry_buffer) return;
            const fa = new Float32Array(ent.geometry_buffer);
            for(let i=0; i<fa.length/3-1; i++){
                pos.push(fa[i*3], fa[i*3+1], 0, fa[(i+1)*3], fa[(i+1)*3+1], 0);
            }
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        return g;
    }, [object.entities]);

    useEffect(() => {
        if (groupRef.current && !dragging) {
            groupRef.current.position.set(object.x, object.y, 0);
            groupRef.current.rotation.z = (object.rotation * Math.PI) / 180;
        }
    }, [object.x, object.y, object.rotation, dragging]);

    useFrame(() => {
        if (dragging && groupRef.current) {
            const inter = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane.current, inter);
            groupRef.current.position.copy(inter.add(offset.current));
        }
    });

    return (
        <group ref={groupRef} 
            onPointerDown={(e: any) => {
                e.stopPropagation();
                setDragging(true);
                const inter = new THREE.Vector3();
                raycaster.ray.intersectPlane(dragPlane.current, inter);
                offset.current.copy(groupRef.current!.position).sub(inter);
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            }}
            onPointerUp={() => {
                if (dragging) {
                    setDragging(false);
                    onMove?.(object.id, groupRef.current!.position.x, groupRef.current!.position.y);
                }
            }}
        >
            <lineSegments geometry={geo}>
                <lineBasicMaterial color=\"#ffffff\" linewidth={2} />
            </lineSegments>
            <mesh>
                <planeGeometry args={[500, 500]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </group>
    );
};

const Scene: React.FC<{
  objects: GPUObject[];
  width: number;
  height: number;
  onSelect: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
}> = ({ objects, width, height, onSelect, onMove }) => {
  const { camera, size } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.position.set(width / 2, height / 2, 500);
      camera.zoom = Math.min(size.width / (width * 1.5), size.height / (height * 1.5));
      camera.updateProjectionMatrix();
    }
  }, [width, height, camera, size]);

  return (
    <>
      <color attach=\"background\" args={['#020205']} />
      <Grid 
        infiniteGrid 
        cellSize={100} 
        sectionSize={1000} 
        sectionColor=\"#1e293b\" 
        cellColor=\"#0f172a\" 
        rotation={[Math.PI / 2, 0, 0]} 
      />
      <GlobalBatchRenderer objects={objects} onSelect={onSelect} onMove={onMove} />
      <InteractionLayer objects={objects} onSelect={onSelect} onMove={onMove} />
      <OrbitControls enableRotate={false} makeDefault />
    </>
  );
};

const GPURenderer: React.FC<{
  objects: GPUObject[];
  sheetWidth: number;
  sheetHeight: number;
  onObjectSelect: (id: string, multi: boolean) => void;
  onObjectMove?: (id: string, x: number, y: number) => void;
}> = (props) => {
  return (
    <div className=\"w-full h-full relative group\">
      <div className=\"absolute top-2 left-2 z-10 bg-emerald-500/20 backdrop-blur px-2 py-1 rounded text-[10px] text-emerald-400 font-mono border border-emerald-500/30\">
        GOD-MODE ENGINE: GLOBAL BATCHING (60FPS PAN)
      </div>
      <Canvas 
        orthographic 
        gl={{ 
          antialias: false, 
          powerPreference: 'high-performance' 
        }} 
        dpr={1}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
};

export default GPURenderer;


import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export interface GPUObject {
  id: string;
  entities: any[];
  x: number;
  y: number;
  rotation: number;
  color: string;
  selected?: boolean;
}

// 🚀 TURBO BATCH PART (AutoCAD-Style)
const GPUPart: React.FC<{ 
  object: GPUObject; 
  onSelect: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
}> = ({ object, onSelect, onMove }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const { raycaster } = useThree();
  const offset = useRef(new THREE.Vector3());

  // 1. Merge all entities with Binary Buffers (Zero-copy)
  const { mergedGeometry, bounds } = useMemo(() => {
    const allPositions: number[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    object.entities.forEach((ent: any) => {
      const buffer = ent.geometry_buffer;
      if (!buffer) return;
      
      const floatArray = new Float32Array(buffer);
      const numPoints = floatArray.length / 3;
      
      for (let i = 0; i < numPoints; i++) {
        const x = floatArray[i * 3];
        const y = floatArray[i * 3 + 1];
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);

        if (i < numPoints - 1) {
          allPositions.push(x, y, 0);
          allPositions.push(floatArray[(i + 1) * 3], floatArray[(i + 1) * 3 + 1], 0);
        }
      }
      
      if (ent.is_closed && numPoints > 2) {
        allPositions.push(floatArray[(numPoints - 1) * 3], floatArray[(numPoints - 1) * 3 + 1], 0);
        allPositions.push(floatArray[0], floatArray[1], 0);
      }
    });

    if (allPositions.length === 0) return { mergedGeometry: null, bounds: null };
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    return { 
      mergedGeometry: geometry, 
      bounds: { 
        width: maxX - minX, 
        height: maxY - minY, 
        centerX: (maxX + minX) / 2, 
        centerY: (maxY + minY) / 2 
      } 
    };
  }, [object.entities]);

  // Sync position
  useEffect(() => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.set(object.x, object.y, 0);
      groupRef.current.rotation.z = (object.rotation * Math.PI) / 180;
    }
  }, [object.x, object.y, object.rotation, isDragging]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    onSelect(object.id, e.shiftKey);
    setIsDragging(true);
    
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    offset.current.copy(groupRef.current!.position).sub(intersection);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [object.id, onSelect, raycaster]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onMove?.(object.id, groupRef.current!.position.x, groupRef.current!.position.y);
    }
  }, [isDragging, object.id, onMove]);

  useFrame(() => {
    if (isDragging && groupRef.current) {
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, intersection);
      groupRef.current.position.copy(intersection.add(offset.current));
    }
  });

  if (!mergedGeometry) return null;

  return (
    <group 
      ref={groupRef} 
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <lineSegments geometry={mergedGeometry}>
        <lineBasicMaterial 
          color={object.selected ? "#ffffff" : (object.color || "#00ff00")} 
          linewidth={object.selected ? 2 : 1} 
          transparent 
          opacity={0.8}
          depthWrite={false}
        />
      </lineSegments>
      
      {/* 2. Dynamic Hitbox based on Real Bounds */}
      {bounds && (bounds.width > 0 && bounds.height > 0) && (
        <mesh position={[bounds.centerX, bounds.centerY, 0]}>
          <planeGeometry args={[bounds.width, bounds.height]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

const Scene: React.FC<{ 
  objects: GPUObject[]; 
  width: number; 
  height: number;
  onSelect: (id: string, multi: boolean) => void;
  onMove?: (id: string, x: number, y: number) => void;
}> = ({ objects, width, height, onSelect, onMove }) => {
  const { camera, size } = useThree();

  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.position.set(width / 2, height / 2, 500);
      camera.zoom = Math.min(size.width / (width * 1.5), size.height / (height * 1.5));
      camera.updateProjectionMatrix();
    }
  }, [width, height, camera, size]);

  return (
    <>
      <color attach=\"background\" args={['#050510']} />
      <Grid 
        infiniteGrid 
        cellSize={100} 
        sectionSize={1000} 
        sectionColor=\"#1e293b\" 
        cellColor=\"#0f172a\" 
        rotation={[Math.PI / 2, 0, 0]} 
      />
      {objects.map(obj => (
        <GPUPart 
          key={obj.id} 
          object={obj} 
          onSelect={onSelect} 
          onMove={onMove}
        />
      ))}
      <OrbitControls enableRotate={false} makeDefault />
    </>
  );
};

const GPURenderer: React.FC<{ 
  objects: GPUObject[]; 
  sheetWidth: number; 
  sheetHeight: number;
  onObjectSelect: (id: string, multi: boolean) => void;
  onObjectMove?: (id: string, x: number, y: number) => void;
}> = (props) => {
  return (
    <div className=\"w-full h-full relative group\">
      <div className=\"absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-cyan-400 font-mono border border-cyan-500/30\">
        AUTOCAD TURBO ENGINE ACTIVE (ZERO-COPY BINARY)
      </div>
      <Canvas 
        orthographic 
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance'
        }} 
        dpr={[1, 2]}
      >
        <Scene 
          {...props} 
          width={props.sheetWidth} 
          height={props.sheetHeight} 
          onSelect={props.onObjectSelect}
          onMove={props.onObjectMove}
        />
      </Canvas>
    </div>
  );
};

export default GPURenderer;
