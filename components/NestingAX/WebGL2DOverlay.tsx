import React, { useRef, useEffect, useMemo } from 'react';
import { CadEntity } from '@/types';

interface WebGLOverlayProps {
  entities: CadEntity[];
  viewOffset: { x: number; y: number };
  pixelsPerUnit: number;
  width: number;
  height: number;
  selectedEntityIds: Set<string>;
}

export const WebGL2DOverlay: React.FC<WebGLOverlayProps> = ({
  entities,
  viewOffset,
  pixelsPerUnit,
  width,
  height,
  selectedEntityIds
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null);

  // We only rebuild the geometry array when entities or selection changes, NOT when panning
  const { positions, colors, vertexCount } = useMemo(() => {
    // console.log("Rebuilding WebGL geometry for", entities.length, "entities");
    const pos: number[] = [];
    const col: number[] = [];
    
    // Very simple fallback color scheme
    const defaultColor = [1, 1, 1, 0.8]; // white
    const selectedColor = [0, 1, 0, 1.0]; // green

    for (const ent of entities) {
      const isSelected = selectedEntityIds.has(ent.id);
      const c = isSelected ? selectedColor : defaultColor;

      if (ent.type === 'line' && ent.points.length >= 2) {
        pos.push(ent.points[0].x, ent.points[0].y);
        pos.push(ent.points[1].x, ent.points[1].y);
        col.push(...c, ...c);
      } 
      else if (ent.type === 'polyline' || ent.type === 'rect' || ent.type === 'polygon') {
        const pts = ent.points;
        const isClosed = ent.type === 'rect' || ent.type === 'polygon' || ent.properties?.closed;
        const len = pts.length;
        
        for (let i = 0; i < len - 1; i++) {
          pos.push(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
          col.push(...c, ...c);
        }
        
        if (isClosed && len > 2) {
          pos.push(pts[len-1].x, pts[len-1].y, pts[0].x, pts[0].y);
          col.push(...c, ...c);
        }
      }
      else if (ent.type === 'circle') {
        const cx = ent.points[0].x;
        const cy = ent.points[0].y;
        const r = ent.properties?.radius || 1;
        const segments = 32; // basic circle
        for (let i = 0; i < segments; i++) {
          const a1 = (i / segments) * Math.PI * 2;
          const a2 = ((i + 1) / segments) * Math.PI * 2;
          pos.push(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
          pos.push(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
          col.push(...c, ...c);
        }
      }
      // Note: Arcs and Ellipses simplified here to keep it lightweight. 
      // Real implementation would need full arc-to-segments math.
    }

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
      vertexCount: pos.length / 2
    };
  }, [entities, selectedEntityIds]);

  // Init WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;
    glRef.current = gl as WebGLRenderingContext;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      uniform vec2 u_resolution;
      uniform vec2 u_offset;
      uniform float u_scale;
      varying vec4 v_color;
      void main() {
        // Convert world to screen
        vec2 screenPos = vec2(
          (a_position.x - u_offset.x) * u_scale,
          (u_offset.y - a_position.y) * u_scale
        );
        // Convert screen to clip space (-1 to +1)
        vec2 clipSpace = (screenPos / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec4 v_color;
      void main() {
        gl_FragColor = v_color;
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    programRef.current = program;

    bufferRef.current = gl.createBuffer();
  }, []);

  // Upload geometry data whenever it changes
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const buffer = bufferRef.current;
    if (!gl || !program || !buffer || vertexCount === 0) return;

    // Interleave positions and colors for a single buffer
    const interleaved = new Float32Array(vertexCount * 6); // 2 pos + 4 color per vertex
    for (let i = 0; i < vertexCount; i++) {
      interleaved[i * 6 + 0] = positions[i * 2 + 0];
      interleaved[i * 6 + 1] = positions[i * 2 + 1];
      interleaved[i * 6 + 2] = colors[i * 4 + 0];
      interleaved[i * 6 + 3] = colors[i * 4 + 1];
      interleaved[i * 6 + 4] = colors[i * 4 + 2];
      interleaved[i * 6 + 5] = colors[i * 4 + 3];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

  }, [positions, colors, vertexCount]);

  // Render loop (updates on pan/zoom without React re-render of geometry)
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const buffer = bufferRef.current;
    const canvas = canvasRef.current;
    if (!gl || !program || !buffer || !canvas || vertexCount === 0) return;

    // Resize canvas internal resolution to match display size
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    gl.clearColor(0, 0, 0, 0); // transparent background
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const posLoc = gl.getAttribLocation(program, "a_position");
    const colLoc = gl.getAttribLocation(program, "a_color");
    
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 24, 0);
    
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 24, 8);

    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const offLoc = gl.getUniformLocation(program, "u_offset");
    const scaleLoc = gl.getUniformLocation(program, "u_scale");

    gl.uniform2f(resLoc, width, height);
    gl.uniform2f(offLoc, viewOffset.x, viewOffset.y);
    gl.uniform1f(scaleLoc, pixelsPerUnit);

    // Enable blending for anti-aliasing / transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.LINES, 0, vertexCount);

  }, [width, height, viewOffset, pixelsPerUnit, vertexCount]); // <--- Highly optimized: only runs very cheap WebGL draw call on pan

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
