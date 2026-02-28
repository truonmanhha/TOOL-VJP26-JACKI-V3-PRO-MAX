'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export interface GPUObject {
  id: string;
  entities: any[];
  x: number;
  y: number;
  rotation: number;
  color: string;
}

// 🚀 ENGINE RENDER ĐƯỜNG LIÊN TỤC (LINE STRIP)
const CADEntityComponent: React.FC<{ entity: any }> = ({ entity }) => {
  const geomRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (geomRef.current && entity.geometry_b64) {
      // Giải mã Base64 -> Float32Array
      const binaryString = atob(entity.geometry_b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const floatArray = new Float32Array(bytes.buffer);

      const attribute = new THREE.BufferAttribute(floatArray, 3);
      geomRef.current.setAttribute('position', attribute);
      geomRef.current.computeBoundingSphere();
    }
  }, [entity.geometry_b64]);

  return (
    <group>
      {entity.is_closed ? (
        <lineLoop>
          <bufferGeometry ref={geomRef} />
          <lineBasicMaterial color={entity.color || "#00ff00"} linewidth={1} />
        </lineLoop>
      ) : (
        <line>
          <bufferGeometry ref={geomRef} />
          <lineBasicMaterial color={entity.color || "#00ff00"} linewidth={1} />
        </line>
      )}
    </group>
  );
};

const GPUPart: React.FC<{ object: any }> = ({ object }) => {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(object.x, object.y, 0);
      groupRef.current.rotation.z = (object.rotation * Math.PI) / 180;
    }
  }, [object.x, object.y, object.rotation]);

  return (
    <group ref={groupRef}>
      {object.entities.map((ent: any, idx: number) => (
        <CADEntityComponent key={idx} entity={ent} />
      ))}
    </group>
  );
};

const Scene: React.FC<{ objects: any[]; width: number; height: number }> = ({ objects, width, height }) => {
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
      <color attach="background" args={['#050510']} />
      <Grid infiniteGrid cellSize={100} sectionSize={1000} sectionColor="#1e293b" cellColor="#0f172a" rotation={[Math.PI / 2, 0, 0]} />
      {objects.map(obj => <GPUPart key={obj.id} object={obj} />)}
      <OrbitControls enableRotate={false} />
    </>
  );
};

const GPURenderer: React.FC<{ objects: any[]; sheetWidth: number; sheetHeight: number }> = (props) => {
  return (
    <div className="w-full h-full relative group">
      <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-cyan-400 font-mono border border-cyan-500/30">
        CLEAN PATH ENGINE ACTIVE
      </div>
      <Canvas orthographic gl={{ antialias: true }}>
        <Scene {...props} width={props.sheetWidth} height={props.sheetHeight} />
      </Canvas>
    </div>
  );
};

export default GPURenderer;
