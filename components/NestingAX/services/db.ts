// Simulated Database and Backend Service
// In a real app, this would be API calls (axios/fetch) to a Node.js/Python server.

export interface NestList {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  status: 'Draft' | 'Nested' | 'Completed' | 'active';
}

export interface Part {
  id: string;
  nestListId: string; // Foreign Key
  name: string;
  dimensions: string; // Format "WidthxHeight" e.g., "100x200"
  required: number;
  priority: number;
  mirrored: boolean;
  rotation: string;
  grainDirection: 'None' | 'Horizontal' | 'Vertical';
  allowedRotations: number[];
  smallPart: boolean;
  kitNumber: string;
  ignore3D: boolean;
  cadEntities?: any[]; // Full CAD entities for accurate preview (line, circle, polyline, etc)
  geometry?: { x: number; y: number }[]; // Legacy: Simple points array
  
  // Nesting Results
  isNested?: boolean;
  sheetId?: string;
  x?: number;
  y?: number;
  rotationAngle?: number;
}

export interface Sheet {
  id: string;
  nestListId: string; // Foreign Key
  material: string;
  dimensions: string; // Format "WidthxHeight" e.g., "3000x1500"
  thickness: number;
  quantity: number;
  cost: number;
  category: string;
  supplier: string;
  grainDirection: 'None' | 'Horizontal' | 'Vertical';
  x?: number;
  y?: number;
}

// New Interface for Layers (Task 18)
export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export interface CadEntity {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  properties?: any;
  layerId?: string; // Task 18
}

// New Interface for Sheet Database (Inventory)
export interface StockSheet {
  id: string;
  material: string;
  width: number;
  height: number;
  thickness: number;
  available: number;
  cost: number;
  category: string;
  supplier: string;
  grainDirection: 'None' | 'Horizontal' | 'Vertical';
}

// ============ APP SETTINGS (Alphacam 2020.0 Compatible) ============
export interface AppSettings {
  nestingMethod: 'Rectangular' | 'TrueShape' | 'Original' | 'VeroNester';
  itemType: 'Toolpaths' | 'Geometries' | 'Both';
  ncCodeType: 'Subroutines' | 'Linear';
  sheetOrder: 'Best' | 'Picked';
  packTo: 'TL' | 'BL' | 'TR' | 'BR' | 'T' | 'B' | 'L' | 'R' | 'Custom';
  customAngle: number;
  evenlySpacedParts: boolean;
  searchResolution: number;
  offcutPref: 'Vertical' | 'Horizontal';
  gaps: {
    minGapPath: number;
    leadInGap: number;
    sheetEdgeGap: number;
    timePerSheet: number;
    totalCompTime: number;
  };
  rectEngine: {
    optimizeFor: 'Cuts' | 'Space';
    cutDirection: 'X' | 'Y' | 'Auto';
    cutWidth: number;
    minPartGap: number;
    gapAtSheetEdge: number;
    ncCode: 'Subroutines' | 'Linear';
    optimiseLevel: number;
    sheetNestBalance: number;
    selectBestSheet: boolean;
  };
  extensions: {
    enabledExtensions: string[];
    extensionConfigs: Record<string, any>;
  };
  defaultSettingsFile: string;
  nestListName: string;
}

const KEYS = {
  LISTS: 'nesting_workspace_lists',
  PARTS: 'nesting_workspace_parts',
  SHEETS: 'nesting_workspace_sheets',
  STOCK: 'nesting_workspace_stock',
  SETTINGS: 'nesting_workspace_settings',
  SEEDED: 'nesting_ax_seeded_final'
};

const DEFAULT_SETTINGS: AppSettings = {
  nestingMethod: 'VeroNester',
  itemType: 'Geometries',
  ncCodeType: 'Linear',
  sheetOrder: 'Best',
  packTo: 'TL',
  customAngle: 0,
  evenlySpacedParts: false,
  searchResolution: 10,
  offcutPref: 'Horizontal',
  gaps: {
    minGapPath: 6,
    leadInGap: 0,
    sheetEdgeGap: 1,
    timePerSheet: 30,
    totalCompTime: 60
  },
  rectEngine: {
    optimizeFor: 'Space',
    cutDirection: 'Auto',
    cutWidth: 3,
    minPartGap: 5,
    gapAtSheetEdge: 5,
    ncCode: 'Linear',
    optimiseLevel: 5,
    sheetNestBalance: 5,
    selectBestSheet: true
  },
  extensions: {
    enabledExtensions: ['Cut Small Parts First', 'Onion Skin Small Parts'],
    extensionConfigs: {}
  },
  defaultSettingsFile: '',
  nestListName: 'New Nest List'
};

export const db = {
  init: () => {
    if (!localStorage.getItem(KEYS.STOCK)) {
      const initialStock: StockSheet[] = [
        { id: 'stk_1', material: 'Mild Steel', width: 3000, height: 1500, thickness: 5.0, available: 50, cost: 120, category: 'Steel', supplier: 'General Steel Co.', grainDirection: 'None' },
        { id: 'stk_7', material: 'Plywood', width: 2440, height: 1220, thickness: 18.0, available: 60, cost: 45, category: 'Wood', supplier: 'Timber Trade', grainDirection: 'Vertical' },
      ];
      localStorage.setItem(KEYS.STOCK, JSON.stringify(initialStock));
    }
  },

  getNestLists: (): NestList[] => {
    try {
      const data = localStorage.getItem(KEYS.LISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addNestList: async (data: Partial<NestList>): Promise<string> => {
    const lists = db.getNestLists();
    const newList: NestList = {
      id: data.id || crypto.randomUUID(),
      name: data.name || 'New Nest List',
      description: data.description,
      createdAt: Date.now(),
      status: data.status || 'Draft'
    };
    lists.push(newList);
    localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
    return newList.id;
  },

  deleteNestList: (id: string) => {
    const lists = db.getNestLists().filter(l => l.id !== id);
    localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
    const partsData = localStorage.getItem(KEYS.PARTS);
    if (partsData) {
      const allParts: Part[] = JSON.parse(partsData);
      localStorage.setItem(KEYS.PARTS, JSON.stringify(allParts.filter(p => p.nestListId !== id)));
    }
    const sheetsData = localStorage.getItem(KEYS.SHEETS);
    if (sheetsData) {
      const allSheets: Sheet[] = JSON.parse(sheetsData);
      localStorage.setItem(KEYS.SHEETS, JSON.stringify(allSheets.filter(s => s.nestListId !== id)));
    }
  },

  getParts: (nestListId: string): Part[] => {
    const data = localStorage.getItem(KEYS.PARTS);
    const allParts: Part[] = data ? JSON.parse(data) : [];
    return allParts.filter(p => p.nestListId === nestListId);
  },

  getSheets: (nestListId: string): Sheet[] => {
    const data = localStorage.getItem(KEYS.SHEETS);
    const allSheets: Sheet[] = data ? JSON.parse(data) : [];
    return allSheets.filter(s => s.nestListId === nestListId);
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
};
