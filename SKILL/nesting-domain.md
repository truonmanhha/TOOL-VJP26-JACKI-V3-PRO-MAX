# Nesting Tool Domain Skill - CNC Nesting Specialization

## Description
Domain-specific skill for CNC nesting tool development. Covers DXF parsing, GCode generation, nesting algorithms, CAD operations, and geometry calculations.

## Domain Overview

### Key Concepts
1. **Nesting**: Arranging parts on sheet material to minimize waste
2. **DXF**: Drawing Exchange Format - CAD file format
3. **GCode**: CNC machine instructions
4. **Sheet**: Material plate (thép, nhôm, etc.)
5. **Part**: Component to be cut from sheet
6. **Remnant**: Leftover material after cutting
7. **Kerf**: Width of cut (dao cắt)

## DXF Operations

### Parsing DXF Files
```typescript
import { DxfService } from './services/dxfService';

// Parse DXF file
const parseDXF = async (file: File): Promise<DXFData> => {
  const text = await file.text();
  return DxfService.parse(text);
};

// Extract entities
interface DXFEntity {
  type: 'LINE' | 'ARC' | 'CIRCLE' | 'POLYLINE' | 'LWPOLYLINE';
  layer: string;
  points?: Point2D[];
  center?: Point2D;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

// Get bounding box
const getBoundingBox = (entities: DXFEntity[]): Rect => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  entities.forEach(entity => {
    if (entity.points) {
      entity.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};
```

### DXF Entity Processing
```typescript
// Convert entities to polygon
const entitiesToPolygon = (entities: DXFEntity[]): Point2D[] => {
  const points: Point2D[] = [];
  
  entities.forEach(entity => {
    switch (entity.type) {
      case 'LINE':
        if (entity.points && entity.points.length >= 2) {
          points.push(entity.points[0], entity.points[1]);
        }
        break;
      case 'ARC':
        // Convert arc to line segments
        if (entity.center && entity.radius !== undefined) {
          const segments = arcToSegments(
            entity.center,
            entity.radius,
            entity.startAngle || 0,
            entity.endAngle || 360,
            16  // Number of segments
          );
          points.push(...segments);
        }
        break;
      case 'CIRCLE':
        // Convert circle to polygon
        if (entity.center && entity.radius) {
          const segments = circleToSegments(
            entity.center,
            entity.radius,
            32  // Number of segments
          );
          points.push(...segments);
        }
        break;
      case 'LWPOLYLINE':
        // Lightweight polyline - already has points
        if (entity.points) {
          points.push(...entity.points);
        }
        break;
    }
  });
  
  return points;
};

// Arc to line segments
const arcToSegments = (
  center: Point2D,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number
): Point2D[] => {
  const points: Point2D[] = [];
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const step = (endRad - startRad) / segments;
  
  for (let i = 0; i <= segments; i++) {
    const angle = startRad + step * i;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    });
  }
  
  return points;
};
```

## Nesting Algorithms

### 1. Bottom-Left Algorithm (BL)
```typescript
interface NestingPart {
  id: string;
  name: string;
  width: number;
  height: number;
  polygon: Point2D[];
  quantity: number;
  canRotate: boolean;
}

interface Sheet {
  id: string;
  width: number;
  height: number;
  material: string;
  thickness: number;
}

interface Placement {
  partId: string;
  sheetId: string;
  x: number;
  y: number;
  rotation: number;  // 0, 90, 180, 270
}

// Simple bottom-left nesting
const bottomLeftNesting = (
  parts: NestingPart[],
  sheet: Sheet,
  kerf: number = 0
): Placement[] => {
  const placements: Placement[] = [];
  const occupied: Rect[] = [];
  
  // Sort parts by area (largest first)
  const sortedParts = [...parts].sort((a, b) => 
    (b.width * b.height) - (a.width * a.height)
  );
  
  for (const part of sortedParts) {
    for (let i = 0; i < part.quantity; i++) {
      let bestX = Infinity;
      let bestY = Infinity;
      let bestRotation = 0;
      let placed = false;
      
      // Try both orientations
      const orientations = part.canRotate 
        ? [{ w: part.width, h: part.height, r: 0 },
           { w: part.height, h: part.width, r: 90 }]
        : [{ w: part.width, h: part.height, r: 0 }];
      
      for (const orient of orientations) {
        // Find bottom-left position
        for (let y = 0; y <= sheet.height - orient.h; y++) {
          for (let x = 0; x <= sheet.width - orient.w; x++) {
            const rect: Rect = {
              x, y,
              width: orient.w + kerf,
              height: orient.h + kerf
            };
            
            // Check if position is valid
            if (!occupied.some(o => rectsOverlap(o, rect))) {
              // Bottom-left heuristic: prefer lower y, then lower x
              if (y < bestY || (y === bestY && x < bestX)) {
                bestX = x;
                bestY = y;
                bestRotation = orient.r;
                placed = true;
              }
              break;  // Found valid position in this row
            }
          }
        }
      }
      
      if (placed) {
        placements.push({
          partId: part.id,
          sheetId: sheet.id,
          x: bestX,
          y: bestY,
          rotation: bestRotation
        });
        
        occupied.push({
          x: bestX,
          y: bestY,
          width: part.canRotate && bestRotation === 90 
            ? part.height + kerf : part.width + kerf,
          height: part.canRotate && bestRotation === 90 
            ? part.width + kerf : part.height + kerf
        });
      }
    }
  }
  
  return placements;
};

// Rectangle overlap check
const rectsOverlap = (a: Rect, b: Rect): boolean => {
  return !(a.x + a.width <= b.x ||
           b.x + b.width <= a.x ||
           a.y + a.height <= b.y ||
           b.y + b.height <= a.y);
};
```

### 2. Genetic Algorithm
```typescript
interface GeneticOptions {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
}

// Genetic algorithm for nesting
const geneticNesting = (
  parts: NestingPart[],
  sheet: Sheet,
  options: GeneticOptions
): Placement[] => {
  // Initialize population
  let population = initializePopulation(parts, sheet, options.populationSize);
  
  for (let gen = 0; gen < options.generations; gen++) {
    // Evaluate fitness
    const fitness = population.map(chromosome => 
      evaluateFitness(chromosome, parts, sheet)
    );
    
    // Selection
    const selected = tournamentSelection(population, fitness, 3);
    
    // Crossover
    const offspring = crossover(selected, options.crossoverRate);
    
    // Mutation
    mutate(offspring, options.mutationRate, sheet);
    
    // Replace population
    population = [...selected, ...offspring].slice(0, options.populationSize);
  }
  
  // Return best solution
  const fitness = population.map(chromosome => 
    evaluateFitness(chromosome, parts, sheet)
  );
  const bestIndex = fitness.indexOf(Math.max(...fitness));
  
  return decodeChromosome(population[bestIndex], parts, sheet);
};

// Chromosome: sequence of (partIndex, rotation, position)
type Chromosome = Array<{
  partIndex: number;
  rotation: number;
  x: number;
  y: number;
}>;

// Fitness based on material utilization
const evaluateFitness = (
  chromosome: Chromosome,
  parts: NestingPart[],
  sheet: Sheet
): number => {
  let totalPartArea = 0;
  let validPlacements = 0;
  const occupied: Rect[] = [];
  
  for (const gene of chromosome) {
    const part = parts[gene.partIndex];
    const { w, h } = gene.rotation % 180 === 0 
      ? { w: part.width, h: part.height }
      : { w: part.height, h: part.width };
    
    const rect: Rect = { x: gene.x, y: gene.y, width: w, height: h };
    
    // Check bounds
    if (gene.x + w > sheet.width || gene.y + h > sheet.height) {
      continue;
    }
    
    // Check overlap
    if (occupied.some(o => rectsOverlap(o, rect))) {
      continue;
    }
    
    totalPartArea += part.width * part.height;
    validPlacements++;
    occupied.push(rect);
  }
  
  const sheetArea = sheet.width * sheet.height;
  const utilization = totalPartArea / sheetArea;
  
  // Fitness combines utilization and number of placed parts
  return utilization * 100 + validPlacements;
};
```

### 3. Shelf Algorithm
```typescript
// Shelf algorithm (guillotine cut)
const shelfNesting = (
  parts: NestingPart[],
  sheet: Sheet,
  kerf: number = 0
): Placement[] => {
  const placements: Placement[] = [];
  
  // Sort by height (decreasing)
  const sortedParts = [...parts].sort((a, b) => 
    Math.max(b.height, b.width) - Math.max(a.height, a.width)
  );
  
  type Shelf = {
    y: number;
    height: number;
    currentX: number;
  };
  
  const shelves: Shelf[] = [];
  
  for (const part of sortedParts) {
    for (let i = 0; i < part.quantity; i++) {
      const orientations = part.canRotate
        ? [{ w: part.width, h: part.height, r: 0 },
           { w: part.height, h: part.width, r: 90 }]
        : [{ w: part.width, h: part.height, r: 0 }];
      
      let placed = false;
      
      for (const orient of orientations) {
        // Try to fit in existing shelf
        for (const shelf of shelves) {
          if (orient.h <= shelf.height && 
              shelf.currentX + orient.w + kerf <= sheet.width) {
            placements.push({
              partId: part.id,
              sheetId: sheet.id,
              x: shelf.currentX,
              y: shelf.y,
              rotation: orient.r
            });
            
            shelf.currentX += orient.w + kerf;
            placed = true;
            break;
          }
        }
        
        if (placed) break;
        
        // Create new shelf
        const lastShelf = shelves[shelves.length - 1];
        const newY = lastShelf 
          ? lastShelf.y + lastShelf.height + kerf 
          : 0;
        
        if (newY + orient.h <= sheet.height) {
          shelves.push({
            y: newY,
            height: orient.h,
            currentX: orient.w + kerf
          });
          
          placements.push({
            partId: part.id,
            sheetId: sheet.id,
            x: 0,
            y: newY,
            rotation: orient.r
          });
          
          placed = true;
          break;
        }
      }
    }
  }
  
  return placements;
};
```

## Geometry Operations

### Polygon Operations
```typescript
// Calculate polygon area
const polygonArea = (points: Point2D[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

// Calculate centroid
const polygonCentroid = (points: Point2D[]): Point2D => {
  let cx = 0, cy = 0;
  const area = polygonArea(points);
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
  }
  
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  
  return { x: cx, y: cy };
};

// Rotate polygon
const rotatePolygon = (
  points: Point2D[],
  angle: number,
  center: Point2D = { x: 0, y: 0 }
): Point2D[] => {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  return points.map(p => ({
    x: center.x + (p.x - center.x) * cos - (p.y - center.y) * sin,
    y: center.y + (p.x - center.x) * sin + (p.y - center.y) * cos
  }));
};

// Translate polygon
const translatePolygon = (
  points: Point2D[],
  dx: number,
  dy: number
): Point2D[] => {
  return points.map(p => ({
    x: p.x + dx,
    y: p.y + dy
  }));
};

// Convex hull (Graham scan)
const convexHull = (points: Point2D[]): Point2D[] => {
  if (points.length < 3) return points;
  
  // Find lowest point
  const start = points.reduce((min, p) => 
    p.y < min.y || (p.y === min.y && p.x < min.x) ? p : min
  );
  
  // Sort by polar angle
  const sorted = points
    .filter(p => p !== start)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - start.y, a.x - start.x);
      const angleB = Math.atan2(b.y - start.y, b.x - start.x);
      return angleA - angleB;
    });
  
  // Graham scan
  const hull: Point2D[] = [start];
  
  for (const point of sorted) {
    while (hull.length > 1 && 
           crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
      hull.pop();
    }
    hull.push(point);
  }
  
  return hull;
};

const crossProduct = (o: Point2D, a: Point2D, b: Point2D): number => {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
};

// Minimum bounding rectangle
const minimumBoundingRect = (points: Point2D[]): { 
  rect: Rect; 
  rotation: number 
} => {
  const hull = convexHull(points);
  let minArea = Infinity;
  let bestRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let bestRotation = 0;
  
  // Try each edge of hull as base
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    const edge = {
      x: hull[j].x - hull[i].x,
      y: hull[j].y - hull[i].y
    };
    
    const angle = Math.atan2(edge.y, edge.x);
    const rotated = rotatePolygon(points, -angle * 180 / Math.PI);
    
    // Get bounding box
    const xs = rotated.map(p => p.x);
    const ys = rotated.map(p => p.y);
    const rect: Rect = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
    
    const area = rect.width * rect.height;
    if (area < minArea) {
      minArea = area;
      bestRect = rect;
      bestRotation = angle * 180 / Math.PI;
    }
  }
  
  return { rect: bestRect, rotation: bestRotation };
};
```

## GCode Generation

### Basic Structure
```typescript
interface GCodeConfig {
  feedRate: number;        // mm/min
  plungeRate: number;      // mm/min
  safeHeight: number;      // mm
  cutHeight: number;       // mm
  kerf: number;            // mm
  useOffset: boolean;      // Apply kerf offset
}

interface CutPath {
  type: 'cut' | 'pierce' | 'rapid';
  points: Point2D[];
}

// Generate GCode from placements
const generateGCode = (
  placements: Placement[],
  parts: Map<string, NestingPart>,
  config: GCodeConfig
): string => {
  const lines: string[] = [];
  
  // Header
  lines.push('(CNC Nesting GCode)');
  lines.push(`(Generated: ${new Date().toISOString()})`);
  lines.push('');
  lines.push('G21 (Metric units)');
  lines.push('G90 (Absolute positioning)');
  lines.push('G17 (XY plane)');
  lines.push('');
  
  // Process each placement
  for (const placement of placements) {
    const part = parts.get(placement.partId);
    if (!part) continue;
    
    lines.push(`(Part: ${part.name})`);
    
    // Transform part polygon to sheet coordinates
    const transformed = transformPart(
      part.polygon,
      placement.x,
      placement.y,
      placement.rotation
    );
    
    // Apply kerf offset if needed
    const cutPolygon = config.useOffset
      ? offsetPolygon(transformed, config.kerf / 2)
      : transformed;
    
    // Generate cut path
    lines.push(...generateCutPath(cutPolygon, config));
    lines.push('');
  }
  
  // Footer
  lines.push('G0 Z50 (Retract)');
  lines.push('M30 (Program end)');
  
  return lines.join('\n');
};

// Transform part to placement position
const transformPart = (
  polygon: Point2D[],
  x: number,
  y: number,
  rotation: number
): Point2D[] => {
  const rotated = rotatePolygon(polygon, rotation);
  return translatePolygon(rotated, x, y);
};

// Offset polygon outward by distance
const offsetPolygon = (
  points: Point2D[],
  offset: number
): Point2D[] => {
  const result: Point2D[] = [];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    
    // Calculate normals
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v1Len = Math.sqrt(v1x * v1x + v1y * v1y);
    const n1x = -v1y / v1Len;
    const n1y = v1x / v1Len;
    
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const v2Len = Math.sqrt(v2x * v2x + v2y * v2y);
    const n2x = -v2y / v2Len;
    const n2y = v2x / v2Len;
    
    // Average normal
    const nx = (n1x + n2x) / 2;
    const ny = (n1y + n2y) / 2;
    const nLen = Math.sqrt(nx * nx + ny * ny);
    
    // Offset vertex
    result.push({
      x: curr.x + (nx / nLen) * offset,
      y: curr.y + (ny / nLen) * offset
    });
  }
  
  return result;
};

// Generate GCode for a single cut path
const generateCutPath = (
  polygon: Point2D[],
  config: GCodeConfig
): string[] => {
  const lines: string[] = [];
  
  if (polygon.length === 0) return lines;
  
  // Move to start position (rapid)
  lines.push(`G0 X${polygon[0].x.toFixed(3)} Y${polygon[0].y.toFixed(3)}`);
  
  // Plunge
  lines.push(`G1 Z${config.cutHeight} F${config.plungeRate}`);
  
  // Set feed rate
  lines.push(`F${config.feedRate}`);
  
  // Cut along path
  for (let i = 1; i < polygon.length; i++) {
    lines.push(`G1 X${polygon[i].x.toFixed(3)} Y${polygon[i].y.toFixed(3)}`);
  }
  
  // Close path
  lines.push(`G1 X${polygon[0].x.toFixed(3)} Y${polygon[0].y.toFixed(3)}`);
  
  // Retract
  lines.push(`G0 Z${config.safeHeight}`);
  
  return lines;
};
```

## Three.js Integration

### Canvas Rendering
```typescript
import * as THREE from 'three';

// Setup Three.js scene for nesting visualization
const setupNestingScene = (container: HTMLElement) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  
  const camera = new THREE.OrthographicCamera(
    -100, 100, 100, -100, 0.1, 1000
  );
  camera.position.z = 100;
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  
  return { scene, camera, renderer };
};

// Draw sheet
const drawSheet = (
  scene: THREE.Scene,
  sheet: Sheet,
  color: number = 0x333333
): THREE.Mesh => {
  const geometry = new THREE.PlaneGeometry(sheet.width, sheet.height);
  const material = new THREE.MeshBasicMaterial({ 
    color,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(sheet.width / 2, sheet.height / 2, 0);
  scene.add(mesh);
  return mesh;
};

// Draw part placement
const drawPlacement = (
  scene: THREE.Scene,
  placement: Placement,
  part: NestingPart,
  color: number = 0x00ff00
): THREE.Mesh => {
  const shape = new THREE.Shape();
  const polygon = transformPart(
    part.polygon,
    placement.x,
    placement.y,
    placement.rotation
  );
  
  if (polygon.length > 0) {
    shape.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].y);
    }
    shape.closePath();
  }
  
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({ 
    color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = 1;
  scene.add(mesh);
  
  return mesh;
};

// Update camera to fit sheet
const fitCameraToSheet = (
  camera: THREE.OrthographicCamera,
  sheet: Sheet,
  padding: number = 1.1
) => {
  const centerX = sheet.width / 2;
  const centerY = sheet.height / 2;
  
  camera.left = centerX - (sheet.width * padding) / 2;
  camera.right = centerX + (sheet.width * padding) / 2;
  camera.top = centerY + (sheet.height * padding) / 2;
  camera.bottom = centerY - (sheet.height * padding) / 2;
  
  camera.updateProjectionMatrix();
};
```

## Best Practices

1. **Geometry Precision**: Use fixed-point arithmetic or high-precision floats
2. **Kerf Compensation**: Always account for kerf in calculations
3. **Rotation Optimization**: Try multiple rotations (0°, 90°, 180°, 270°)
4. **Part Nesting Order**: Place larger parts first
5. **Memory Management**: Clean up Three.js objects when not needed
6. **Progressive Rendering**: Show nesting progress in real-time
7. **Error Handling**: Handle invalid DXF files gracefully
8. **Performance**: Use web workers for heavy calculations
9. **Validation**: Always verify GCode before sending to machine
10. **Testing**: Test with various DXF file formats and versions
