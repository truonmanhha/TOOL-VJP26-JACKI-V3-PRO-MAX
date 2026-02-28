
import { Layer, CadEntity } from './db';

const KEYS = {
  LAYERS: 'nesting_workspace_layers',
  ACTIVE_LAYER: 'nesting_workspace_active_layer'
};

const DEFAULT_LAYER: Layer = {
  id: 'default',
  name: 'Layer 0',
  color: '#00ff00',
  visible: true,
  locked: false,
  order: 0
};

class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId: string = 'default';

  constructor() {
    this.loadLayers();
  }

  getLayers(): Layer[] {
    return this.layers;
  }

  getActiveLayerId(): string {
    return this.activeLayerId;
  }

  addLayer(name: string, color: string = '#ffffff'): Layer {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name,
      color,
      visible: true,
      locked: false,
      order: this.layers.length
    };
    this.layers.push(newLayer);
    this.saveLayers();
    return newLayer;
  }

  removeLayer(id: string, entities: CadEntity[]): { updatedEntities: CadEntity[] } {
    if (id === 'default') return { updatedEntities: entities };

    this.layers = this.layers.filter(l => l.id !== id);
    if (this.activeLayerId === id) {
      this.activeLayerId = 'default';
    }

    // Move entities on this layer to default layer
    const updatedEntities = entities.map(entity => {
      if (entity.layerId === id) {
        return { ...entity, layerId: 'default' };
      }
      return entity;
    });

    this.saveLayers();
    return { updatedEntities };
  }

  renameLayer(id: string, name: string) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.name = name;
      this.saveLayers();
    }
  }

  setColor(id: string, color: string) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.color = color;
      this.saveLayers();
    }
  }

  toggleVisible(id: string): boolean {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      this.saveLayers();
      return layer.visible;
    }
    return true;
  }

  toggleLocked(id: string): boolean {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.locked = !layer.locked;
      this.saveLayers();
      return layer.locked;
    }
    return false;
  }

  setActiveLayer(id: string) {
    if (this.layers.some(l => l.id === id)) {
      this.activeLayerId = id;
      localStorage.setItem(KEYS.ACTIVE_LAYER, id);
    }
  }

  getLayerForEntity(entity: CadEntity): Layer {
    return this.layers.find(l => l.id === entity.layerId) || DEFAULT_LAYER;
  }

  saveLayers() {
    localStorage.setItem(KEYS.LAYERS, JSON.stringify(this.layers));
    localStorage.setItem(KEYS.ACTIVE_LAYER, this.activeLayerId);
  }

  loadLayers() {
    try {
      const savedLayers = localStorage.getItem(KEYS.LAYERS);
      const savedActive = localStorage.getItem(KEYS.ACTIVE_LAYER);
      
      if (savedLayers) {
        this.layers = JSON.parse(savedLayers);
      } else {
        this.layers = [DEFAULT_LAYER];
      }

      if (savedActive && this.layers.some(l => l.id === savedActive)) {
        this.activeLayerId = savedActive;
      } else {
        this.activeLayerId = 'default';
      }
    } catch (e) {
      console.error("Failed to load layers", e);
      this.layers = [DEFAULT_LAYER];
      this.activeLayerId = 'default';
    }
  }
}

export const layerManager = new LayerManager();
