import { cadEntitiesToGeometry } from './components/nesting/NewNestList/VectorPreview';

const mockPolygonEntity = {
  id: 'poly-1',
  type: 'polygon',
  points: [
    { x: 100, y: 100 }, // Center
    { x: 150, y: 100 }  // Edge (Radius = 50)
  ],
  properties: {
    sides: 6
  }
};

const mockRectangleEntity = {
  id: 'rect-1',
  type: 'rectangle',
  points: [
    { x: 0, y: 0 },
    { x: 200, y: 100 }
  ]
};

const mockCircleEntity = {
  id: 'circle-1',
  type: 'circle',
  points: [
    { x: 50, y: 50 }
  ],
  radius: 25
};

console.log('Testing cadEntitiesToGeometry...');

console.log('\n--- POLYGON TEST ---');
const polyResult = cadEntitiesToGeometry([mockPolygonEntity]);
console.log(`Input: 2 points. Output Paths: ${polyResult.paths.length}`);
if (polyResult.paths.length > 0) {
  console.log(`Path Type: ${polyResult.paths[0].type}`);
  console.log(`Path Points Count: ${polyResult.paths[0].points.length}`);
  console.log('Points:', polyResult.paths[0].points);
}

console.log('\n--- RECTANGLE TEST ---');
const rectResult = cadEntitiesToGeometry([mockRectangleEntity]);
console.log(`Input: 2 points. Output Paths: ${rectResult.paths.length}`);
if (rectResult.paths.length > 0) {
  console.log(`Path Type: ${rectResult.paths[0].type}`);
  console.log(`Path Points Count: ${rectResult.paths[0].points.length}`);
  console.log('Points:', rectResult.paths[0].points);
}

console.log('\n--- CIRCLE TEST ---');
const circleResult = cadEntitiesToGeometry([mockCircleEntity]);
console.log(`Input: 1 point + radius. Output Paths: ${circleResult.paths.length}`);
if (circleResult.paths.length > 0) {
  console.log(`Path Type: ${circleResult.paths[0].type}`);
  console.log(`Path Points Count: ${circleResult.paths[0].points.length}`);
}

// Mock what the workspace does on "Save Part"
console.log('\n--- WORKSPACE SNAPSHOT MOCK ---');
let minX = Infinity, minY = Infinity;
polyResult.paths.forEach(path => {
  path.points.forEach(pt => {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
  });
});

console.log(`Bounds: minX=${minX}, minY=${minY}`);

const snapshotEntities = polyResult.paths.map((path, idx) => ({
  id: `stable_${idx}`,
  type: 'polyline',
  points: path.points.map(pt => ({
    x: pt.x - minX,
    y: pt.y - minY
  }))
}));

console.log('Snapshot generated entity:', JSON.stringify(snapshotEntities, null, 2));

// Mock what Sidebar does with the snapshot
console.log('\n--- SIDEBAR SVG MOCK ---');
let svgPathData = "";
snapshotEntities.forEach(entity => {
  entity.points.forEach((pt, i) => {
    if (i === 0) svgPathData += `M ${pt.x} ${pt.y} `;
    else svgPathData += `L ${pt.x} ${pt.y} `;
  });
  svgPathData += "Z ";
});

console.log('Sidebar SVG Path:', svgPathData);
