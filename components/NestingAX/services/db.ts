// Simulated Database and Backend Service
// In a real app, this would be API calls (axios/fetch) to a Node.js/Python server.

export interface NestList {
  id: string;
  name: string;
  createdAt: number;
  status: 'Draft' | 'Nested' | 'Completed';
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
// Full settings interface matching Alphacam Nesting add-in capabilities.
// Sections: General, Engine (gaps/timing), Rectangular Engine, Extensions, Metadata.
// See: ALPHACAM 2020.0\Add-Ins\Nesting\Bitmaps\NestListSettings*.cfg

export interface AppSettings {
  // ---- General Settings (NestListSettingsGeneral.cfg) ----
  /** Nesting algorithm: Rectangular (bin-pack), TrueShape (NFP), Original (legacy), VeroNester (advanced) */
  nestingMethod: 'Rectangular' | 'TrueShape' | 'Original' | 'VeroNester';
  /** What to nest: toolpaths only, geometries only, or both */
  itemType: 'Toolpaths' | 'Geometries' | 'Both';
  /** NC code output format */
  ncCodeType: 'Subroutines' | 'Linear';
  /** Sheet selection order: Best utilisation or user-picked order */
  sheetOrder: 'Best' | 'Picked';

  // ---- Engine Settings (NestListSettingsEngine.cfg) ----
  /** Pack direction: corners (TL/BL/TR/BR), edges (T/B/L/R), or Custom angle */
  packTo: 'TL' | 'BL' | 'TR' | 'BR' | 'T' | 'B' | 'L' | 'R' | 'Custom';
  /** Custom packing angle in degrees (used when packTo is 'Custom') */
  customAngle: number;
  /** Distribute parts evenly across sheet area */
  evenlySpacedParts: boolean;
  /** NFP search resolution — higher = more accurate but slower (1-100) */
  searchResolution: number;
  /** Preferred offcut direction for remnant tracking */
  offcutPref: 'Vertical' | 'Horizontal';

  // ---- Gap & Timing Settings ----
  gaps: {
    /** Minimum gap between cutting paths (mm) */
    minGapPath: number;
    /** Extra gap at lead-in start points (mm) */
    leadInGap: number;
    /** Gap from parts to sheet edge (mm) */
    sheetEdgeGap: number;
    /** Max computation time per sheet in seconds */
    timePerSheet: number;
    /** Total computation time budget in seconds */
    totalCompTime: number;
  };

  // ---- Rectangular Engine Settings (NestListSettingsRectEngine.cfg) ----
  // Only active when nestingMethod is 'Rectangular'
  rectEngine: {
    /** Optimize for fewer cuts or better space utilization */
    optimizeFor: 'Cuts' | 'Space';
    /** Primary cut direction */
    cutDirection: 'X' | 'Y' | 'Auto';
    /** Cutting tool width / kerf (mm) */
    cutWidth: number;
    /** Minimum gap around parts (mm) */
    minPartGap: number;
    /** Gap at sheet edge (mm) — separate from general sheetEdgeGap */
    gapAtSheetEdge: number;
    /** NC code format for rectangular engine output */
    ncCode: 'Subroutines' | 'Linear';
    /** Optimization level: 1 (fast) to 10 (thorough) */
    optimiseLevel: number;
    /** Sheet vs nest quality balance: 1 (fill sheets) to 10 (minimize waste) */
    sheetNestBalance: number;
    /** Auto-select best sheet size from stock database */
    selectBestSheet: boolean;
  };

  // ---- Extensions Settings (NestListSettingsExtensions.cfg) ----
  // Add-on features that modify nesting behavior
  extensions: {
    /** List of enabled extension names (from NESTING_EXTENSIONS) */
    enabledExtensions: string[];
    /** Per-extension configuration objects keyed by extension name */
    extensionConfigs: Record<string, any>;
  };

  // ---- Metadata & Persistence ----
  /** Path to default .nst settings file (Alphacam settings import/export) */
  defaultSettingsFile: string;
  /** Default name for new nest lists */
  nestListName: string;
}

// ============ DEEP MERGE UTILITY ============
// Recursively merges saved (partial) settings with defaults.
// Ensures new fields added in updates are always present.
function deepMerge<T extends Record<string, any>>(defaults: T, saved: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(saved) as (keyof T)[]) {
    const savedVal = saved[key];
    const defaultVal = defaults[key];
    if (
      savedVal !== undefined &&
      savedVal !== null &&
      typeof savedVal === 'object' &&
      !Array.isArray(savedVal) &&
      typeof defaultVal === 'object' &&
      !Array.isArray(defaultVal) &&
      defaultVal !== null
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(defaultVal as any, savedVal as any);
    } else if (savedVal !== undefined) {
      // Primitive or array — use saved value directly
      result[key] = savedVal as T[keyof T];
    }
  }
  return result;
}

const KEYS = {
  LISTS: 'nesting_workspace_lists',
  PARTS: 'nesting_workspace_parts',
  SHEETS: 'nesting_workspace_sheets',
  STOCK: 'nesting_workspace_stock',
  SETTINGS: 'nesting_workspace_settings'
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

export const NESTING_EXTENSIONS = [
  'Bridged Nesting',
  'Cut Small Parts First',
  'Onion Skin Small Parts',
  'Chain Cutting',
  'Common Line Cutting',
  'Pre-drill Start Points',
  'Avoid Web Thinning',
  'Corner Loops',
  'Lead-in/out Optimization',
  'Automatic Tab Placement',
  'Skeleton Cut-up',
  'Remnant Tracking',
  'Sheet Clamping Avoidance',
  'Thermal Stress Distribution'
];

export const db = {
  // --- Initialization / Seeding ---
  init: () => {
    // Seed Stock Data if empty
    if (!localStorage.getItem(KEYS.STOCK)) {
      const initialStock: StockSheet[] = [
        // Steel
        { id: 'stk_1', material: 'Mild Steel', width: 3000, height: 1500, thickness: 5.0, available: 50, cost: 120, category: 'Steel', supplier: 'General Steel Co.', grainDirection: 'None' },
        { id: 'stk_2', material: 'Mild Steel', width: 2000, height: 1000, thickness: 10.0, available: 15, cost: 180, category: 'Steel', supplier: 'General Steel Co.', grainDirection: 'None' },
        { id: 'stk_3', material: 'Stainless 304', width: 2500, height: 1250, thickness: 2.0, available: 20, cost: 250, category: 'Steel', supplier: 'Inox Supply', grainDirection: 'Horizontal' },
        { id: 'stk_4', material: 'Stainless 316', width: 2500, height: 1250, thickness: 2.0, available: 10, cost: 350, category: 'Steel', supplier: 'Inox Supply', grainDirection: 'Horizontal' },
        
        // Aluminum
        { id: 'stk_5', material: 'Aluminum 5052', width: 2400, height: 1200, thickness: 3.0, available: 100, cost: 95, category: 'Aluminum', supplier: 'AluFab', grainDirection: 'None' },
        { id: 'stk_6', material: 'Aluminum 6061', width: 2400, height: 1200, thickness: 5.0, available: 40, cost: 140, category: 'Aluminum', supplier: 'AluFab', grainDirection: 'None' },
        
        // Wood
        { id: 'stk_7', material: 'Plywood', width: 2440, height: 1220, thickness: 18.0, available: 60, cost: 45, category: 'Wood', supplier: 'Timber Trade', grainDirection: 'Vertical' },
        { id: 'stk_8', material: 'MDF', width: 2440, height: 1220, thickness: 12.0, available: 80, cost: 30, category: 'Wood', supplier: 'Timber Trade', grainDirection: 'Vertical' },
        { id: 'stk_9', material: 'Oak Veneer', width: 2440, height: 1220, thickness: 19.0, available: 25, cost: 85, category: 'Wood', supplier: 'Timber Trade', grainDirection: 'Vertical' },
        
        // Plastic
        { id: 'stk_10', material: 'Acrylic Clear', width: 2000, height: 1000, thickness: 5.0, available: 30, cost: 110, category: 'Plastic', supplier: 'Polymer Solutions', grainDirection: 'None' },
        { id: 'stk_11', material: 'Polycarbonate', width: 2000, height: 1000, thickness: 3.0, available: 20, cost: 130, category: 'Plastic', supplier: 'Polymer Solutions', grainDirection: 'None' },
        { id: 'stk_12', material: 'PVC Rigid', width: 2000, height: 1000, thickness: 10.0, available: 15, cost: 70, category: 'Plastic', supplier: 'Polymer Solutions', grainDirection: 'None' },
        
        // Composite
        { id: 'stk_13', material: 'Carbon Fiber Plate', width: 1000, height: 1000, thickness: 2.0, available: 5, cost: 500, category: 'Composite', supplier: 'Advanced Materials', grainDirection: 'Horizontal' },
        { id: 'stk_14', material: 'Fiberglass G10', width: 1200, height: 1000, thickness: 3.0, available: 10, cost: 220, category: 'Composite', supplier: 'Advanced Materials', grainDirection: 'None' },
        { id: 'stk_15', material: 'Honeycomb Panel', width: 2000, height: 1000, thickness: 25.0, available: 8, cost: 400, category: 'Composite', supplier: 'Advanced Materials', grainDirection: 'None' },
      ];
      localStorage.setItem(KEYS.STOCK, JSON.stringify(initialStock));
    }
  },

  // --- SETTINGS EXPORT/IMPORT (Task 21) ---
  exportSettingsToJson(): string {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) return JSON.stringify(DEFAULT_SETTINGS, null, 2);
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch (err) {
      console.error('Settings export failed:', err);
      return '';
    }
  },

  importSettingsFromJson(jsonString: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(jsonString);
      
      if (!imported || typeof imported !== 'object') {
        return { success: false, error: 'Invalid JSON: not an object' };
      }
      
      const merged = deepMerge(DEFAULT_SETTINGS, imported as Partial<AppSettings>);
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
      console.log('✅ Settings imported successfully');
      return { success: true };
    } catch (err) {
      console.error('Settings import failed:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  // --- NEST LISTS ---
  getNestLists: (): NestList[] => {
    try {
      const data = localStorage.getItem(KEYS.LISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("DB Load Error", e);
      return [];
    }
  },

  createNestList: (name: string): NestList => {
    const lists = db.getNestLists();
    const newList: NestList = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      status: 'Draft'
    };
    lists.push(newList);
    localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
    return newList;
  },

  deleteNestList: (id: string) => {
    const lists = db.getNestLists().filter(l => l.id !== id);
    localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
    
    // Auto-cleanup: Delete all parts belonging to this list
    const allPartsData = localStorage.getItem(KEYS.PARTS);
    if (allPartsData) {
      const allParts: Part[] = JSON.parse(allPartsData);
      const remainingParts = allParts.filter(p => p.nestListId !== id);
      localStorage.setItem(KEYS.PARTS, JSON.stringify(remainingParts));
    }
  },

  deletePart: (partId: string) => {
    const data = localStorage.getItem(KEYS.PARTS);
    if (data) {
      const allParts: Part[] = JSON.parse(data);
      const remainingParts = allParts.filter(p => p.id !== partId);
      localStorage.setItem(KEYS.PARTS, JSON.stringify(remainingParts));
      console.log(`🗑️ DB: Deleted part ${partId}`);
    }
  },

  updateNestList: (list: NestList) => {
    const lists = db.getNestLists().map(l => l.id === list.id ? list : l);
    localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
  },

  // --- Parts ---
  getParts: (nestListId: string): Part[] => {
    try {
      const data = localStorage.getItem(KEYS.PARTS);
      const allParts: Part[] = data ? JSON.parse(data) : [];
      const filtered = allParts.filter(p => p.nestListId === nestListId);
      
      console.log('📖 DB.getParts() - Retrieved parts:', filtered.length);
      filtered.forEach((p, i) => {
        console.log(`  Part ${i} (${p.name}):`, {
          hasCadEntities: !!p.cadEntities,
          cadEntitiesLength: p.cadEntities?.length,
          cadEntitiesTypes: p.cadEntities?.map(e => e?.type)
        });
      });
      
      return filtered;
    } catch (e) {
      console.error('❌ DB.getParts() error:', e);
      return [];
    }
  },

  addPart: (part: Omit<Part, 'id'>): Part => {
    const data = localStorage.getItem(KEYS.PARTS);
    const allParts: Part[] = data ? JSON.parse(data) : [];
    
    console.log('💾 DB.addPart() - Incoming part data:', {
      name: part.name,
      hasCadEntities: !!part.cadEntities,
      cadEntitiesLength: part.cadEntities?.length,
      cadEntitiesTypes: part.cadEntities?.map(e => e.type)
    });
    
    const newPart: Part = {
      ...part,
      id: crypto.randomUUID()
    };
    
    console.log('💾 DB.addPart() - New part before save:', {
      id: newPart.id,
      hasCadEntities: !!newPart.cadEntities,
      cadEntitiesLength: newPart.cadEntities?.length
    });
    
    allParts.push(newPart);
    localStorage.setItem(KEYS.PARTS, JSON.stringify(allParts));
    
    // Verify what was saved
    const savedData = localStorage.getItem(KEYS.PARTS);
    const savedParts = savedData ? JSON.parse(savedData) : [];
    const justSaved = savedParts.find((p: Part) => p.id === newPart.id);
    console.log('💾 DB.addPart() - Retrieved after save:', {
      hasCadEntities: !!justSaved?.cadEntities,
      cadEntitiesLength: justSaved?.cadEntities?.length
    });
    
    return newPart;
  },

  updatePart: (part: Part) => {
    const data = localStorage.getItem(KEYS.PARTS);
    let allParts: Part[] = data ? JSON.parse(data) : [];
    allParts = allParts.map(p => p.id === part.id ? part : p);
    localStorage.setItem(KEYS.PARTS, JSON.stringify(allParts));
  },

  updatePartsBatch: (parts: Part[]) => {
    const data = localStorage.getItem(KEYS.PARTS);
    let allParts: Part[] = data ? JSON.parse(data) : [];
    const updatesMap = new Map(parts.map(p => [p.id, p]));
    
    allParts = allParts.map(p => updatesMap.has(p.id) ? updatesMap.get(p.id)! : p);
    localStorage.setItem(KEYS.PARTS, JSON.stringify(allParts));
  },

  // --- Sheets (Active in Nest List) ---
  getSheets: (nestListId: string): Sheet[] => {
    try {
      const data = localStorage.getItem(KEYS.SHEETS);
      const allSheets: Sheet[] = data ? JSON.parse(data) : [];
      return allSheets.filter(s => s.nestListId === nestListId);
    } catch (e) {
      return [];
    }
  },

  addSheet: (sheet: Omit<Sheet, 'id'>): Sheet => {
    const data = localStorage.getItem(KEYS.SHEETS);
    const allSheets: Sheet[] = data ? JSON.parse(data) : [];
    
    const newSheet: Sheet = {
      ...sheet,
      id: crypto.randomUUID()
    };
    
    allSheets.push(newSheet);
    localStorage.setItem(KEYS.SHEETS, JSON.stringify(allSheets));
    return newSheet;
  },

  updateSheet: (sheetId: string, updates: Partial<Sheet>): void => {
    const data = localStorage.getItem(KEYS.SHEETS);
    const allSheets: Sheet[] = data ? JSON.parse(data) : [];
    
    const index = allSheets.findIndex(s => s.id === sheetId);
    if (index !== -1) {
      allSheets[index] = { ...allSheets[index], ...updates };
      localStorage.setItem(KEYS.SHEETS, JSON.stringify(allSheets));
    }
  },

  // --- Stock Sheets (Database) ---
  getStockSheets: (): StockSheet[] => {
    try {
      const data = localStorage.getItem(KEYS.STOCK);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- Settings ---
  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (!data) return { ...DEFAULT_SETTINGS };
      
      const saved = JSON.parse(data);
      
      if (saved.gaps?.compTime !== undefined && saved.gaps?.totalCompTime === undefined) {
        saved.gaps.totalCompTime = saved.gaps.compTime;
        delete saved.gaps.compTime;
      }
      
      return deepMerge(DEFAULT_SETTINGS, saved);
    } catch (e) {
      console.error('⚠️ Settings load error, using defaults:', e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
  
  isExtensionEnabled: (name: string): boolean => {
    const settings = db.getSettings();
    return settings.extensions.enabledExtensions.includes(name);
  },

  toggleExtension: (name: string) => {
    const settings = db.getSettings();
    const enabled = settings.extensions.enabledExtensions;
    const index = enabled.indexOf(name);
    if (index > -1) {
      enabled.splice(index, 1);
    } else {
      enabled.push(name);
    }
    db.saveSettings(settings);
  },

   exportProject: () => {
    const data: Record<string, any> = {};
    for (const [key, value] of Object.entries(KEYS)) {
      const val = localStorage.getItem(value);
      if (val) data[value] = JSON.parse(val);
    }
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nesting_ax_parts_') || key.startsWith('nesting_ax_sheets_'))) {
            const val = localStorage.getItem(key);
            if (val) data[key] = JSON.parse(val);
        }
    }
    return JSON.stringify(data, null, 2);
  },

  importProject: (json: string) => {
    try {
      const data = JSON.parse(json);
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      return true;
    } catch (err) {
      console.error('Project import failed:', err);
      return false;
    }
  },
};
