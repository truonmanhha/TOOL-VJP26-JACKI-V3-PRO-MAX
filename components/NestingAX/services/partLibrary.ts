import { CadEntity } from './db';

export interface PartTemplate {
  name: string;
  category: string;
  icon: string;
  getEntities: (params: any) => CadEntity[];
  params: {
    label: string,
    key: string,
    type: 'number' | 'text' | 'bool',
    default: any
  }[];
}

export const partLibrary: PartTemplate[] = [
  {
    name: "Rectangle",
    category: "Standard",
    icon: "crop_square",
    params: [
      { label: "Width (mm)", key: "w", type: "number", default: 100 },
      { label: "Height (mm)", key: "h", type: "number", default: 100 }
    ],
    getEntities: (p) => {
      const w = p.w || 100;
      const h = p.h || 100;
      return [{
        id: crypto.randomUUID(),
        type: 'polyline',
        points: [{x:0,y:0}, {x:w,y:0}, {x:w,y:h}, {x:0,y:h}, {x:0,y:0}]
      }];
    }
  },
  {
    name: "L-Shape",
    category: "Standard",
    icon: "turn_left",
    params: [
      { label: "Width Outer", key: "w1", type: "number", default: 100 },
      { label: "Height Outer", key: "h1", type: "number", default: 100 },
      { label: "Width Inner", key: "w2", type: "number", default: 40 },
      { label: "Height Inner", key: "h2", type: "number", default: 40 }
    ],
    getEntities: (p) => {
      const { w1, h1, w2, h2 } = p;
      return [{
        id: crypto.randomUUID(),
        type: 'polyline',
        points: [{x:0,y:0}, {x:w1,y:0}, {x:w1,y:h2}, {x:w2,y:h2}, {x:w2,y:h1}, {x:0,y:h1}, {x:0,y:0}]
      }];
    }
  },
  {
    name: "Circle",
    category: "Standard",
    icon: "circle",
    params: [
      { label: "Radius (mm)", key: "r", type: "number", default: 50 }
    ],
    getEntities: (p) => {
      const r = p.r || 50;
      return [{
        id: crypto.randomUUID(),
        type: 'circle',
        points: [{x:r, y:r}], // Center
        properties: { radius: r }
      }];
    }
  },
  {
    name: "Bracket",
    category: "Components",
    icon: "grid_view",
    params: [
        { label: "Length", key: "L", type: "number", default: 120 },
        { label: "Width", key: "W", type: "number", default: 60 },
        { label: "Hole D", key: "d", type: "number", default: 10 }
    ],
    getEntities: (p) => {
        const { L, W, d } = p;
        const r = d/2;
        return [
            { id: crypto.randomUUID(), type: 'polyline', points: [{x:0,y:0},{x:L,y:0},{x:L,y:W},{x:0,y:W},{x:0,y:0}] },
            { id: crypto.randomUUID(), type: 'circle', points: [{x:L/4,y:W/2}], properties: { radius: r } },
            { id: crypto.randomUUID(), type: 'circle', points: [{x:3*L/4,y:W/2}], properties: { radius: r } }
        ];
    }
  }
];
