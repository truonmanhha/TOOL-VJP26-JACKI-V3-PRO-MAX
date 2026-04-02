import React, { useMemo, useState, useEffect } from 'react';
import { CadEntity, Layer } from './services/db';
import { resolveDimensionStyleWithOverrides, DimensionStyleOverrides } from './services/dimensionStyles';
import { AXDocumentStore } from './engine/database/documentStore';
import { AXObjectGraph } from './engine/objectGraph/relations';
import { AXMigrationController } from './engine/migration/controller';
import { AXPerformanceRuntime } from './engine/performance/runtime';
import { AXValidationSample } from './engine/validation/sampleMatrix';
import { AXKnownDegradation } from './engine/validation/knownDegradations';
import { AXValidationRunRegistry } from './engine/validation/runRegistry';

interface SidebarBlockDefinition {
  id: string;
  name: string;
  entities: unknown[];
}

interface SidebarBlockInstance {
  id: string;
  blockId: string;
}

interface SidebarXrefEntry {
  id: string;
  name?: string;
  path?: string;
}

export type SidebarPanelTab = 'properties' | 'dimstyle' | 'layers' | 'blocks' | 'xrefs' | 'traces' | 'activity';

const TABS: Array<{ id: SidebarPanelTab; label: string; short: string; icon: React.ReactNode }> = [
  {
    id: 'properties',
    label: 'Properties',
    short: 'Prop',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-5 w-5 fill-current">
        <path d="M17.5 2.5a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5v-15zM3.5 17V3h13v14h-13z" />
        <path d="M5 5h10v1H5zm0 3h10v1H5zm0 3h4v1H5zm0 3h4v1H5zm6-3h4v1h-4zm0 3h4v1h-4z" />
      </svg>
    )
  },
  {
    id: 'dimstyle',
    label: 'Dimstyle',
    short: 'Dim',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M2 4h4v2H4v12h2v2H2V4Zm16 0h4v16h-4v-2h2V6h-2V4ZM7 11h10v2H7v-2Zm3-4h1v10h-1V7Zm3 0h1v10h-1V7Z" />
      </svg>
    )
  },
  {
    id: 'layers',
    label: 'Layers',
    short: 'Layers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-5 w-5 fill-current">
        <path d="M5.5 3L2 6l3.5 3 .5-.5L3.207 6.5H16.5l-2.793 2.5.5.5L18 6l-3.5-3-.5.5L16.793 5.5H3.5zM2 14l3.5-3 .5.5L3.207 13.5H16.5l-2.793-2.5.5-.5L18 14l-3.5 3-.5-.5L16.793 14.5H3.5z" />
      </svg>
    )
  },
  {
    id: 'blocks',
    label: 'Blocks',
    short: 'Blocks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-5 w-5 fill-current">
        <path fillRule="evenodd" d="M3 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3zm2 1h10v5H5V4zm0 7h4v5H5v-5zm6 0h4v5h-4v-5z" clipRule="evenodd" />
      </svg>
    )
  },
  {
    id: 'xrefs',
    label: 'Xrefs',
    short: 'Xrefs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="h-5 w-5 fill-current">
        <path d="M10 3a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V4a1 1 0 0 1 1-1z" /><path d="M3 1a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V1zm0 16a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1z" />
      </svg>
    )
  },
  {
    id: 'traces',
    label: 'Traces',
    short: 'Traces',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <polygon points="24 22 4 22 4 19 21 19 21 6 24 6 24 22" />
        <rect x="4" y="6" width="17" height="13" opacity="0.85" />
        <rect x="0" y="2" width="20" height="16" opacity="0.55" />
        <path d="M0,2V18H20V2H0Zm19,15H1V3H19v14Z" />
        <path d="M6.75,8.75c.59961,0,.77734,.45752,1.00684,1.83203,.1875,1.12598,.44434,2.66797,1.99316,2.66797,.95703,0,1.4541-.49707,1.85352-.89648,.35059-.35059,.60352-.60352,1.14648-.60352,1.27148,0,2.63281,1.34033,2.64648,1.354l.70703-.70752c-.06738-.06738-1.66602-1.64648-3.35352-1.64648-.95703,0-1.4541,.49707-1.85352,.89648-.35059,.35059-.60352,.60352-1.14648,.60352-.59961,0-.77734-.45752-1.00684-1.83203-.1875-1.12598-.44434-2.66797-1.99316-2.66797-1.2168,0-2.34473,1.07178-3.44727,3.27637l.89453,.44727c.89062-1.78174,1.77344-2.72363,2.55273-2.72363Z" />
      </svg>
    )
  },
  {
    id: 'activity',
    label: 'Activity',
    short: 'Activity',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M8.25 0C7.83579 0 7.5 0.335786 7.5 0.75V2H6V4H15V2H13.5V0.75C13.5 0.335786 13.1642 0 12.75 0H8.25Z" />
        <path d="M19 3H16V5H5V3H2V22H15.5L16.5 19H13.5L15.3289 11H19V3Z" opacity="0.75" />
        <path d="M5 8H6V9H5V8Z" />
        <path d="M5 12H6V13H5V12Z" />
        <path d="M6 16H5V17H6V16Z" />
        <path d="M7 8H16V9H7V8Z" />
        <path d="M7 12H14V13H7V12Z" />
        <path d="M12 16H7V17H12V16Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M21 12L19.5 15H24L16.5 24L18 18H15L16.5 12H21Z" />
      </svg>
    )
  },
];

interface SidebarPanelsProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: SidebarPanelTab;
  onTabChange: (tab: SidebarPanelTab) => void;
  allEntities: CadEntity[];
  selectedEntities: CadEntity[];
  layers: Layer[];
  activeLayerId: string;
  onLayerAdd: (name: string, color: string) => void;
  onLayerRename: (id: string, name: string) => void;
  onLayerColor: (id: string, color: string) => void;
  onLayerVisibility: (id: string) => void;
  onLayerLock: (id: string) => void;
  onLayerActive: (id: string) => void;
  onEntityLayerAssign?: (entityIds: string[], layerId: string) => void;
  onUpdateSelectedProperties?: (updates: Record<string, unknown>) => void;
  dimensionStyleOverrides?: DimensionStyleOverrides;
  onUpdateDimensionStyle?: (styleName: string, updates: Record<string, unknown>) => void;
  blockDefinitions: SidebarBlockDefinition[];
  blockInstances: SidebarBlockInstance[];
  xrefs: SidebarXrefEntry[];
  onAddBlock: (name: string) => void;
  axDocumentStore?: AXDocumentStore | null;
  axObjectGraph?: AXObjectGraph | null;
  axMigrationController?: AXMigrationController | null;
  axPerformanceRuntime?: AXPerformanceRuntime | null;
  validationSamples?: AXValidationSample[];
  knownDegradations?: AXKnownDegradation[];
  validationRunRegistry?: AXValidationRunRegistry;
  lastValidationRunAt?: string | null;
  onRunValidationSnapshot?: () => void;
}

const shellBg = '#2e3440';
const panelBg = '#2e3440';
const borderColor = 'rgba(188, 211, 238, 0.10)';
const textPrimary = '#d7e3f2';
const textMuted = '#9fb0c6';
const LINETYPE_OPTIONS = ['ByLayer', 'Continuous', 'Hidden', 'Dashed', 'Center'];
const LINEWEIGHT_OPTIONS = ['ByLayer', '0.00', '0.13', '0.18', '0.25', '0.35', '0.50', '0.70', '1.00'];
const DIMENSION_TYPE_OPTIONS = ['Linear', 'Aligned', 'Angular', 'Diameter', 'Radius'];
const ARROWHEAD_OPTIONS = ['Closed filled', 'Open', 'Dot', 'Architectural tick'];
const STYLE_OPTIONS = ['Standard', 'ISO-25'];
const CAD_COLOR_SWATCHES = [
  '#000000', '#808080', '#c0c0c0', '#ffffff', '#800000', '#ff0000',
  '#808000', '#ffff00', '#008000', '#00ff00', '#008080', '#00ffff',
  '#000080', '#0000ff', '#800080', '#ff00ff', '#804000', '#ff8000',
  '#808040', '#ffff80', '#004040', '#80ffff', '#404080', '#ff80ff',
];


const labelClass = 'text-[12px] font-normal leading-4 text-slate-300';
const valueClass = 'text-[12px] font-normal leading-4 text-slate-100';

type PropertyRowItem =
  | { kind: 'section'; label: string }
  | { kind: 'row'; label: string; value: React.ReactNode; editable?: boolean; editor?: 'text' | 'number' | 'color' | 'select'; field?: string; options?: string[] };


const SidebarPanels: React.FC<SidebarPanelsProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onTabChange,
  allEntities,
  selectedEntities,
  layers,
  activeLayerId,
  onLayerAdd,
  onLayerRename,
  onLayerColor,
  onLayerVisibility,
  onLayerLock,
  onLayerActive,
  onEntityLayerAssign,
  onUpdateSelectedProperties,
  dimensionStyleOverrides,
  onUpdateDimensionStyle,
  blockDefinitions,
  blockInstances,
  xrefs,
  onAddBlock,
  axDocumentStore,
  axObjectGraph,
  axMigrationController,
  axPerformanceRuntime,
  validationSamples = [],
  knownDegradations = [],
  validationRunRegistry,
  lastValidationRunAt,
  onRunValidationSnapshot,
}) => {
  const [newLayerName, setNewLayerName] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [openColorField, setOpenColorField] = useState<string | null>(null);

  const submitLayerEdit = (id: string) => {
    if (editingLayerName.trim()) onLayerRename(id, editingLayerName.trim());
    setEditingLayerId(null);
    setEditingLayerName('');
  };

  const handlePropertyUpdate = React.useCallback((field: string, rawValue: string) => {
    if (field.startsWith('__dimstyle.') && onUpdateDimensionStyle) {
      const styleField = field.replace('__dimstyle.', '');
      const activeStyleName = String(selectedEntities[0]?.properties?.dimensionStyle || 'Standard');
      const numericStyleFields = new Set(['textHeightFactor', 'arrowSize', 'gap', 'extOvershoot']);
      const booleanStyleFields = new Set(['centerMark']);

      let value: unknown = rawValue;
      if (numericStyleFields.has(styleField)) {
        const parsed = Number(rawValue);
        value = Number.isFinite(parsed) ? parsed : rawValue;
      } else if (booleanStyleFields.has(styleField)) {
        value = rawValue === 'true';
      }

      onUpdateDimensionStyle(activeStyleName, { [styleField]: value });
      return;
    }

    if (field === 'layerId' && onEntityLayerAssign) {
      onEntityLayerAssign(selectedEntities.map(entity => entity.id), rawValue);
      return;
    }

    if (field === 'layerVisible' && selectedEntities.length > 0) {
      const layer = layers.find(item => item.id === selectedEntities[0].layerId);
      const shouldBeVisible = rawValue === 'true';
      if (layer && layer.visible !== shouldBeVisible) {
        onLayerVisibility(layer.id);
      }
      return;
    }

    if (field === 'layerLocked' && selectedEntities.length > 0) {
      const layer = layers.find(item => item.id === selectedEntities[0].layerId);
      const shouldBeLocked = rawValue === 'true';
      if (layer && layer.locked !== shouldBeLocked) {
        onLayerLock(layer.id);
      }
      return;
    }

    if (!onUpdateSelectedProperties) return;

    const numericFields = new Set(['rotation', 'scale', 'textHeight', 'measurement']);
    const booleanFields = new Set(['isClosed']);

    let value: unknown = rawValue;
    if (numericFields.has(field)) {
      const parsed = Number(rawValue);
      value = Number.isFinite(parsed) ? parsed : rawValue;
    } else if (booleanFields.has(field)) {
      value = rawValue === 'true';
    }

    onUpdateSelectedProperties({ [field]: value });
  }, [layers, onEntityLayerAssign, onLayerLock, onLayerVisibility, onUpdateDimensionStyle, onUpdateSelectedProperties, selectedEntities]);

  const renderEditor = React.useCallback((row: Extract<PropertyRowItem, { kind: 'row' }>) => {
    if (!row.editable || !row.field) {
      return <div className={`${valueClass} text-right truncate`}>{row.value}</div>;
    }

    const inputClass = 'w-full border border-slate-700/80 bg-[#252c35] px-2 py-[5px] text-right text-[12px] leading-4 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-150 focus:border-cyan-500 focus:bg-[#2a323d]';
    const normalizedValue = row.value === 'Varies' || row.value === '—' ? '' : row.value;
    const displayValue = typeof normalizedValue === 'string' || typeof normalizedValue === 'number' ? String(normalizedValue) : '';

    if (row.editor === 'select') {
      return (
        <select className={inputClass} value={displayValue} onChange={(event) => handlePropertyUpdate(row.field!, event.target.value)}>
          {(row.options ?? []).map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (row.editor === 'color') {
      return (
        <div className="relative ml-auto w-full">
          <button
            type="button"
            onClick={() => setOpenColorField(current => current === row.field ? null : row.field!)}
            className="flex w-full items-center justify-between gap-2 border border-slate-700/80 bg-[#252c35] px-2 py-[5px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-150 hover:bg-[#2a323d]"
          >
            <span className={`${valueClass} truncate`}>{displayValue || '#000000'}</span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border border-slate-500" style={{ backgroundColor: displayValue || '#000000' }} />
              <span className="text-[10px] text-slate-400">▾</span>
            </span>
          </button>
          {openColorField === row.field ? (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-full border border-slate-700/90 bg-[#20262f] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
              <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">24 basic colors</div>
              <div className="grid grid-cols-6 gap-1">
                {CAD_COLOR_SWATCHES.map(color => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Choose color ${color}`}
                    onClick={() => {
                      handlePropertyUpdate(row.field!, color);
                      setOpenColorField(null);
                    }}
                    className="h-4 w-full border transition-transform duration-100 hover:scale-105"
                    style={{
                      backgroundColor: color,
                      borderColor: (displayValue || '#000000').toLowerCase() === color.toLowerCase() ? '#67e8f9' : 'rgba(148,163,184,0.45)',
                      boxShadow: (displayValue || '#000000').toLowerCase() === color.toLowerCase() ? '0 0 0 1px rgba(103,232,249,0.35)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return <input className={inputClass} type={row.editor === 'number' ? 'number' : 'text'} value={displayValue} onChange={(event) => handlePropertyUpdate(row.field!, event.target.value)} />;
  }, [handlePropertyUpdate, openColorField]);

  const selectedLayerIds = useMemo(
    () => Array.from(new Set(selectedEntities.map(entity => entity.layerId).filter(Boolean))) as string[],
    [selectedEntities]
  );

  const validationDomainSummary = useMemo(() => {
    return validationSamples.reduce<Record<string, number>>((acc, sample) => {
      acc[sample.domain] = (acc[sample.domain] ?? 0) + 1;
      return acc;
    }, {});
  }, [validationSamples]);

  const documentWarningPreview = useMemo(() => {
    return axDocumentStore?.diagnostics.warnings.slice(0, 4) ?? [];
  }, [axDocumentStore]);

  const unsupportedTypeEntries = useMemo(() => {
    return Object.entries(axDocumentStore?.diagnostics.unsupportedTypes ?? {}).sort((a, b) => b[1] - a[1]);
  }, [axDocumentStore]);

  const runtimeFlags = useMemo(() => {
    if (!axPerformanceRuntime) return [];
    return [
      ['Spatial index', axPerformanceRuntime.spatialIndexEnabled],
      ['Render cache', axPerformanceRuntime.renderCacheEnabled],
      ['Dirty redraw', axPerformanceRuntime.dirtyRedrawEnabled],
      ['Workerized processing', axPerformanceRuntime.workerizedProcessingEnabled],
    ] as Array<[string, boolean]>;
  }, [axPerformanceRuntime]);

  const xrefDegradation = useMemo(() => {
    return knownDegradations.find(item => item.domain === 'xref');
  }, [knownDegradations]);

  const xrefUnsupportedCount = axDocumentStore?.diagnostics.unsupportedTypes.XREF ?? 0;
  const validationRuns = validationRunRegistry?.runs ?? [];

  const getEntityValue = React.useCallback((entity: CadEntity, key: string) => {
    const rootValue = (entity as unknown as Record<string, unknown>)[key];
    if (rootValue !== undefined && rootValue !== null) return rootValue;

    const propertyBag = entity.properties as Record<string, unknown> | undefined;
    return propertyBag?.[key];
  }, []);

  const formatScalar = React.useCallback((value: unknown): string => {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }, []);

  const getCommonValue = React.useCallback((key: string, fallback: React.ReactNode = '—'): React.ReactNode => {
    if (selectedEntities.length === 0) return fallback;

    const values = selectedEntities.map(entity => getEntityValue(entity, key));
    const presentValues = values.filter(value => value !== undefined && value !== null && value !== '');
    if (presentValues.length === 0) return fallback;

    const normalized = presentValues.map(value => String(value));
    const first = normalized[0];
    return normalized.every(value => value === first) ? formatScalar(presentValues[0]) : 'Varies';
  }, [formatScalar, getEntityValue, selectedEntities]);

  const getNumericSummary = React.useCallback((key: string): React.ReactNode => {
    if (selectedEntities.length === 0) return '—';

    const values = selectedEntities
      .map(entity => getEntityValue(entity, key))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (values.length === 0) return '—';

    const first = values[0];
    return values.every(value => value === first) ? formatScalar(first) : 'Varies';
  }, [formatScalar, getEntityValue, selectedEntities]);

  const getLayerValue = React.useCallback((): React.ReactNode => {
    if (selectedEntities.length === 0) return '0';
    if (selectedLayerIds.length > 1) return 'Varies';

    const layer = layers.find(item => item.id === selectedLayerIds[0]);
    return layer?.name ?? '0';
  }, [layers, selectedEntities.length, selectedLayerIds]);

  const selectionTypeSummary = useMemo(() => {
    const counts = new Map<string, number>();
    selectedEntities.forEach(entity => counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1));
    return Array.from(counts.entries());
  }, [selectedEntities]);

  const objectPropertyRows: PropertyRowItem[] = useMemo(() => {
    if (selectedEntities.length === 0) {
      return [
        { kind: 'section', label: 'General' },
        { kind: 'row', label: 'Type', value: 'None' },
        { kind: 'row', label: 'Object ID', value: '—' },
        { kind: 'row', label: 'Handle', value: '—' },
        { kind: 'row', label: 'Layer', value: '0', editable: true, editor: 'select', field: 'layerId', options: layers.map(layer => layer.id) },
        {
          kind: 'row',
          label: 'Color',
          value: '#000000', editable: true, editor: 'color', field: 'color'
        },
        { kind: 'row', label: 'Linetype', value: 'ByLayer' },
        { kind: 'row', label: 'Linetype scale', value: '1' },
        { kind: 'row', label: 'Lineweight', value: 'ByLayer' },
        { kind: 'row', label: 'Visible', value: 'Yes', editable: true, editor: 'select', field: 'layerVisible', options: ['true', 'false'] },
        { kind: 'row', label: 'Locked', value: 'No', editable: true, editor: 'select', field: 'layerLocked', options: ['true', 'false'] },

        { kind: 'section', label: 'Geometry' },
        { kind: 'row', label: 'Position X', value: '—' },
        { kind: 'row', label: 'Position Y', value: '—' },
        { kind: 'row', label: 'Width', value: '—' },
        { kind: 'row', label: 'Height', value: '—' },
        { kind: 'row', label: 'Rotation', value: '—', editable: true, editor: 'number', field: 'rotation' },
        { kind: 'row', label: 'Scale', value: '—' },
        { kind: 'row', label: 'Area', value: '—' },
        { kind: 'row', label: 'Vertices', value: '—' },
        { kind: 'row', label: 'Closed', value: '—', editable: true, editor: 'select', field: 'isClosed', options: ['true', 'false'] },

        { kind: 'section', label: 'Annotation / Dimension' },
        { kind: 'row', label: 'Text', value: '—', editable: true, editor: 'text', field: 'text' },
        { kind: 'row', label: 'Text height', value: '—', editable: true, editor: 'number', field: 'textHeight' },
        { kind: 'row', label: 'Dimension type', value: '—' },
        { kind: 'row', label: 'Measurement', value: '—' },
        { kind: 'row', label: 'Arrowhead type', value: '—' },
        { kind: 'row', label: 'Text style', value: 'Standard' },
        { kind: 'row', label: 'Dimension style', value: 'ISO-25' },
        { kind: 'row', label: 'Multileader style', value: 'Standard' },

        { kind: 'section', label: 'Selection' },
        { kind: 'row', label: 'Selected objects', value: 0 },
        { kind: 'row', label: 'Selection mix', value: 'No objects selected' },
        { kind: 'row', label: 'Distinct layers', value: 0 },
      ] as PropertyRowItem[];
    }

    const first = selectedEntities[0];
    const firstLayer = layers.find(layer => layer.id === first.layerId);
    const firstColor = getEntityValue(first, 'color');
    const resolvedDimStyle = resolveDimensionStyleWithOverrides(first.properties?.dimensionStyle ?? 'Standard', dimensionStyleOverrides);
    const selectionBreakdown = selectionTypeSummary.length > 0
      ? selectionTypeSummary.map(([type, count]) => `${type}: ${count}`).join(' · ')
      : '—';

    return [
      { kind: 'section', label: 'General' },
      { kind: 'row', label: 'Type', value: getCommonValue('type', first.type) },
      { kind: 'row', label: 'Object ID', value: selectedEntities.length === 1 ? first.id : 'Varies' },
      { kind: 'row', label: 'Handle', value: selectedEntities.length === 1 ? first.id.slice(0, 8).toUpperCase() : 'Varies' },
      { kind: 'row', label: 'Layer', value: getLayerValue(), editable: true, editor: 'select', field: 'layerId', options: layers.map(layer => layer.id) },
      {
        kind: 'row',
        label: 'Color',
        value: selectedEntities.length === 1 ? formatScalar(firstColor ?? '#000000') : '#000000', editable: true, editor: 'color', field: 'color'
      },
      { kind: 'row', label: 'Linetype', value: getCommonValue('linetype', 'ByLayer') },
      { kind: 'row', label: 'Linetype scale', value: getCommonValue('linetypeScale', '1') },
      { kind: 'row', label: 'Lineweight', value: getCommonValue('lineweight', 'ByLayer') },
      { kind: 'row', label: 'Visible', value: selectedLayerIds.length === 1 ? (firstLayer?.visible ? 'Yes' : 'No') : 'Varies', editable: selectedLayerIds.length === 1, editor: 'select', field: 'layerVisible', options: ['true', 'false'] },
      { kind: 'row', label: 'Locked', value: selectedLayerIds.length === 1 ? (firstLayer?.locked ? 'Yes' : 'No') : 'Varies', editable: selectedLayerIds.length === 1, editor: 'select', field: 'layerLocked', options: ['true', 'false'] },

      { kind: 'section', label: 'Geometry' },
      { kind: 'row', label: 'Position X', value: getNumericSummary('x') },
      { kind: 'row', label: 'Position Y', value: getNumericSummary('y') },
      { kind: 'row', label: 'Width', value: getNumericSummary('width') },
      { kind: 'row', label: 'Height', value: getNumericSummary('height') },
      { kind: 'row', label: 'Rotation', value: getNumericSummary('rotation'), editable: true, editor: 'number', field: 'rotation' },
      { kind: 'row', label: 'Scale', value: getNumericSummary('scale') },
      { kind: 'row', label: 'Area', value: getNumericSummary('area') },
      { kind: 'row', label: 'Vertices', value: getNumericSummary('verticesCount') },
      { kind: 'row', label: 'Closed', value: getCommonValue('isClosed', '—'), editable: true, editor: 'select', field: 'isClosed', options: ['true', 'false'] },

      { kind: 'section', label: 'Annotation / Dimension' },
      { kind: 'row', label: 'Text', value: getCommonValue('text', getCommonValue('mtext', '—')), editable: true, editor: 'text', field: 'text' },
      { kind: 'row', label: 'Text height', value: getNumericSummary('textHeight'), editable: true, editor: 'number', field: 'textHeight' },
      { kind: 'row', label: 'Dimension type', value: getCommonValue('dimensionType') },
      { kind: 'row', label: 'Measurement', value: getNumericSummary('measurement') },
      { kind: 'row', label: 'Arrowhead type', value: getCommonValue('arrowheadType') },
      { kind: 'row', label: 'Text style', value: getCommonValue('textStyle', first.properties?.textStyle ?? 'Standard') },
      { kind: 'row', label: 'Dimension style', value: getCommonValue('dimensionStyle', first.properties?.dimensionStyle ?? 'ISO-25') },
      { kind: 'section', label: 'DIMSTYLE / Text' },
      { kind: 'row', label: 'Dim text factor', value: resolvedDimStyle.textHeightFactor, editable: true, editor: 'number', field: '__dimstyle.textHeightFactor' },
      { kind: 'row', label: 'Dim text placement', value: resolvedDimStyle.textPlacement, editable: true, editor: 'select', field: '__dimstyle.textPlacement', options: ['inside', 'outside-auto'] },
      { kind: 'row', label: 'Dim text rotation', value: resolvedDimStyle.textRotationMode, editable: true, editor: 'select', field: '__dimstyle.textRotationMode', options: ['aligned', 'horizontal'] },
      { kind: 'row', label: 'Dim vertical place', value: resolvedDimStyle.textVerticalPlacement, editable: true, editor: 'select', field: '__dimstyle.textVerticalPlacement', options: ['centered', 'above'] },
      { kind: 'section', label: 'DIMSTYLE / Symbols & Lines' },
      { kind: 'row', label: 'Dim arrow size', value: resolvedDimStyle.arrowSize, editable: true, editor: 'number', field: '__dimstyle.arrowSize' },
      { kind: 'row', label: 'Dim gap', value: resolvedDimStyle.gap, editable: true, editor: 'number', field: '__dimstyle.gap' },
      { kind: 'row', label: 'Dim ext overshoot', value: resolvedDimStyle.extOvershoot, editable: true, editor: 'number', field: '__dimstyle.extOvershoot' },
      { kind: 'row', label: 'Dim fit mode', value: resolvedDimStyle.fitMode, editable: true, editor: 'select', field: '__dimstyle.fitMode', options: ['keep-inside', 'move-text-first'] },
      { kind: 'row', label: 'Center mark', value: resolvedDimStyle.centerMark ? 'On' : 'Off', editable: true, editor: 'select', field: '__dimstyle.centerMark', options: ['true', 'false'] },
      { kind: 'row', label: 'Multileader style', value: getCommonValue('multileaderStyle', first.properties?.multileaderStyle ?? 'Standard') },

      { kind: 'section', label: 'Selection' },
      { kind: 'row', label: 'Selected objects', value: selectedEntities.length },
      { kind: 'row', label: 'Selection mix', value: selectionBreakdown },
      { kind: 'row', label: 'Distinct layers', value: selectedLayerIds.length || 0 },
    ] as PropertyRowItem[];
  }, [selectedEntities, layers, dimensionStyleOverrides, getEntityValue, formatScalar, getCommonValue, getLayerValue, getNumericSummary, selectionTypeSummary, selectedLayerIds]);

  const modelPropertyRows: PropertyRowItem[] = useMemo(() => {
    return [
      { kind: 'section', label: 'Model' },
      { kind: 'row', label: 'Plot style', value: 'None' },
      {
        kind: 'row',
        label: 'Drawing',
        value: `${allEntities.length} entities`
      },
      {
        kind: 'row',
        label: 'Selection',
        value: `${selectedEntities.length} selected`
      },
    ] as PropertyRowItem[];
  }, [allEntities.length, selectedEntities.length]);


  const renderPropertyRows = (rows: PropertyRowItem[]) => (
    <div className="sc-CcUMU eAbfWl">
      {rows.map((row, index) => row.kind === 'section' ? (
        <div key={`${row.label}-${index}`} className="px-0 pb-2 pt-4 first:pt-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{row.label}</div>
        </div>
      ) : (
        <div key={`${row.label}-${index}`} className="sc-ikkVnJ eSruSu property-element-class grid grid-cols-[118px_minmax(0,1fr)] items-center gap-3 px-1 py-[7px] text-[12px] border-b last:border-b-0 transition-colors duration-150 hover:bg-white/[0.02]" style={{ borderColor }}>
          <div data-testid="property-label" style={{ alignItems: 'center', display: 'flex', marginRight: 0 }}>
            <div className={labelClass}>{row.label}</div>
          </div>
          <div className="sc-bRKDuR sc-hlweCQ kAreby usCGF min-w-0">
            <div className="sc-fcSHUR hbFicM">
              {renderEditor(row as Extract<PropertyRowItem, { kind: 'row' }>)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPaletteItem = (title: string, content: React.ReactNode, flex: string, minHeight: string, borderTop: string) => (
    <div style={{ flex, minHeight }} className="flex flex-col">
      <div style={{ borderTop: `${borderTop} solid ${borderColor}`, padding: '4px 16px 4px 16px' }} className="flex h-8 items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span>{title}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4">{content}</div>
    </div>
  );

  const renderProperties = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        'Properties',
        <>
          {renderPropertyRows(objectPropertyRows)}
          {renderPropertyRows(modelPropertyRows)}
          {selectedEntities.length > 0 ? (
            <div className="px-3 py-3 text-[12px] text-slate-400">
              {selectionTypeSummary.map(([type, count]) => `${type}: ${count}`).join(' · ')}
            </div>
          ) : null}
          <div className="property-element-class ml-2 mt-2 text-[13px] text-slate-400" style={{ paddingRight: 16 }}>
            <span style={{ opacity: 0.7 }}>This paper size is unsupported. Its properties can’t be modified. </span>
            <a href="https://help.autodesk.com/view/ACADWEB/ENU/?guid=AutoCAD_Web_Help_Plottopdf_html" target="_blank" rel="noreferrer" className="underline text-slate-200">Learn more</a>
          </div>
        </>,
        '1 1 0',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderDimstyle = () => {
    const selectedDimension = selectedEntities.find(entity => entity.type === 'dimension');
    const activeDimStyleName = selectedDimension?.properties?.dimensionStyle ?? 'Standard';
    const resolvedDimStyle = resolveDimensionStyleWithOverrides(activeDimStyleName, dimensionStyleOverrides);

    const dimstyleRows: PropertyRowItem[] = [
      { kind: 'section', label: 'Current Style' },
      { kind: 'row', label: 'Name', value: activeDimStyleName },
      { kind: 'row', label: 'Applies to', value: selectedDimension ? 'Selected dimensions' : 'Default dimensions' },
      { kind: 'section', label: 'Text' },
      { kind: 'row', label: 'Text factor', value: resolvedDimStyle.textHeightFactor, editable: true, editor: 'number', field: '__dimstyle.textHeightFactor' },
      { kind: 'row', label: 'Placement', value: resolvedDimStyle.textPlacement, editable: true, editor: 'select', field: '__dimstyle.textPlacement', options: ['inside', 'outside-auto'] },
      { kind: 'row', label: 'Rotation', value: resolvedDimStyle.textRotationMode, editable: true, editor: 'select', field: '__dimstyle.textRotationMode', options: ['aligned', 'horizontal'] },
      { kind: 'row', label: 'Vertical place', value: resolvedDimStyle.textVerticalPlacement, editable: true, editor: 'select', field: '__dimstyle.textVerticalPlacement', options: ['centered', 'above'] },
      { kind: 'section', label: 'Symbols & Lines' },
      { kind: 'row', label: 'Arrow size', value: resolvedDimStyle.arrowSize, editable: true, editor: 'number', field: '__dimstyle.arrowSize' },
      { kind: 'row', label: 'Gap', value: resolvedDimStyle.gap, editable: true, editor: 'number', field: '__dimstyle.gap' },
      { kind: 'row', label: 'Ext overshoot', value: resolvedDimStyle.extOvershoot, editable: true, editor: 'number', field: '__dimstyle.extOvershoot' },
      { kind: 'row', label: 'Fit mode', value: resolvedDimStyle.fitMode, editable: true, editor: 'select', field: '__dimstyle.fitMode', options: ['keep-inside', 'move-text-first'] },
      { kind: 'row', label: 'Center mark', value: resolvedDimStyle.centerMark ? 'On' : 'Off', editable: true, editor: 'select', field: '__dimstyle.centerMark', options: ['true', 'false'] },
    ];

    return (
      <div className="flex h-full flex-col">
        {renderPaletteItem(
          'Dimension Style Manager',
          <>
            <div className="mb-3 rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3 text-[12px] text-slate-300">
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">AutoCAD-like DIMSTYLE</div>
              <div className="mt-2 text-slate-100">Editing this panel updates the active style override in real time.</div>
            </div>
            {renderPropertyRows(dimstyleRows)}
          </>,
          '1 1 0',
          '100px',
          '0px'
        )}
      </div>
    );
  };

  const renderLayers = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        `Layers (${layers.length})`,
        <>
          <div className="flex items-center gap-2 pb-3">
            <input type="text" placeholder="New layer name..." value={newLayerName} onChange={e => setNewLayerName(e.target.value)} className="w-full flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[12px] text-slate-100" />
            <button onClick={() => { onLayerAdd(newLayerName, '#ffffff'); setNewLayerName(''); }} className="rounded bg-cyan-600 px-3 py-1 text-sm text-white hover:bg-cyan-500">Add</button>
          </div>
          <div className="flex flex-col">
            {layers.map(layer => {
              const isActive = layer.id === activeLayerId;
              const isEditing = layer.id === editingLayerId;
              return (
                <div key={layer.id} className={`group grid grid-cols-[16px_1fr_20px_20px_20px] items-center gap-3 border-b border-slate-800 py-1 text-sm ${isActive ? 'bg-cyan-500/10' : 'hover:bg-slate-700/30'}`}>
                  <button onClick={() => onLayerActive(layer.id)} className="flex h-full items-center justify-center">
                    {isActive ? <span className="text-cyan-400">✓</span> : <span className="opacity-0 group-hover:opacity-100">·</span>}
                  </button>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingLayerName}
                      onChange={e => setEditingLayerName(e.target.value)}
                      onBlur={() => submitLayerEdit(layer.id)}
                      onKeyDown={e => e.key === 'Enter' && submitLayerEdit(layer.id)}
                      autoFocus
                      className="w-full bg-transparent p-0 text-slate-100 outline-none"
                    />
                  ) : (
                    <div onDoubleClick={() => { setEditingLayerId(layer.id); setEditingLayerName(layer.name); }} className="truncate" style={{ color: layer.color }}>{layer.name}</div>
                  )}
                  <div className="relative">
                    <input type="color" value={layer.color} onChange={e => onLayerColor(layer.id, e.target.value)} className="h-4 w-5 cursor-pointer appearance-none border-0 bg-transparent p-0" />
                  </div>
                  <button onClick={() => onLayerVisibility(layer.id)} className={layer.visible ? 'text-slate-300' : 'text-slate-600'}>{layer.visible ? '👁' : '👁'}</button>
                  <button onClick={() => onLayerLock(layer.id)} className={layer.locked ? 'text-amber-400' : 'text-slate-600'}>{layer.locked ? '🔒' : '🔓'}</button>
                </div>
              );
            })}
          </div>
        </>,
        '1 1 auto',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderBlocks = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        `Blocks (${blockDefinitions.length})`,
        <>
          <div className="flex items-center gap-2 pb-3">
            <input type="text" placeholder="New block name..." value={newBlockName} onChange={e => setNewBlockName(e.target.value)} className="w-full flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[12px] text-slate-100" />
            <button onClick={() => { onAddBlock(newBlockName); setNewBlockName(''); }} className="rounded bg-cyan-600 px-3 py-1 text-sm text-white hover:bg-cyan-500">Create</button>
          </div>
          <div className="flex flex-col gap-1">
            {blockDefinitions.map(def => (
              <div key={def.id} className="rounded-sm bg-slate-800/50 p-2 text-sm text-slate-300">
                {def.name} ({def.entities.length} entities)
              </div>
            ))}
          </div>
        </>,
        '1 1 0',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderXrefs = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        `Xrefs (${xrefs.length})`,
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Runtime xref state</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
              <div>Tracked entries: <span className="text-slate-100">{xrefs.length}</span></div>
              <div>Unsupported XREF types: <span className="text-slate-100">{xrefUnsupportedCount}</span></div>
              <div>Engine render: <span className="text-slate-100">{axMigrationController?.useEngineRender ? 'On' : 'Off'}</span></div>
              <div>Legacy compatibility: <span className="text-slate-100">{axMigrationController?.useLegacyCompatibility ? 'On' : 'Off'}</span></div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Tracked references</div>
            <div className="mt-2 space-y-2 text-[12px]">
              {xrefs.length > 0 ? xrefs.map(xref => (
                <div key={xref.id} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <div className="font-semibold text-slate-100">{xref.name || xref.id}</div>
                  <div className="mt-1 break-all text-slate-400">{xref.path || 'No source path recorded'}</div>
                </div>
              )) : <div className="text-slate-500">No xref references detected in the current runtime snapshot.</div>}
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Known limitation</div>
            <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-2 text-[12px] text-slate-300">
              {xrefDegradation?.issue || 'No explicit xref degradation registered.'}
            </div>
          </div>
        </div>,
        '1 1 0',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderTraces = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        'Traces',
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Document diagnostics</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
              <div>Imported: <span className="text-slate-100">{axDocumentStore?.diagnostics.importedCount ?? 0}</span></div>
              <div>Skipped: <span className="text-slate-100">{axDocumentStore?.diagnostics.skippedCount ?? 0}</span></div>
              <div>Blocks: <span className="text-slate-100">{axDocumentStore?.blocks.allNames.length ?? 0}</span></div>
              <div>Layers: <span className="text-slate-100">{axDocumentStore?.layers.allIds.length ?? 0}</span></div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Validation corpus</div>
            <div className="mt-2 text-[12px] text-slate-400">{validationSamples.length} representative samples registered</div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRunValidationSnapshot}
                className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200 transition-colors hover:bg-cyan-500/20"
              >
                Run validation snapshot
              </button>
              <div className="text-right text-[11px] text-slate-500">
                {lastValidationRunAt ? `Last run ${new Date(lastValidationRunAt).toLocaleString('en-GB')}` : 'No validation run yet'}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(validationDomainSummary).map(([domain, count]) => (
                <span key={domain} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-200">
                  {domain}: {count}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Validation results</div>
            <div className="mt-2 space-y-2 text-[12px]">
              {validationRuns.length > 0 ? validationRuns.map(run => (
                <div key={run.sampleId} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-100">{run.sampleId}</div>
                    <div className={run.passed ? 'text-emerald-300' : 'text-amber-300'}>{run.passed ? 'PASS' : 'PARTIAL'}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {run.checks.map(check => (
                      <div key={check.check} className="flex items-start justify-between gap-3 text-[11px]">
                        <span className="text-slate-300">{check.check}</span>
                        <span className={check.passed ? 'text-emerald-300' : 'text-slate-500'}>{check.passed ? '✓' : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div className="text-slate-500">Run the validation snapshot to populate executable sample results.</div>}
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Known degradations</div>
            <div className="mt-2 space-y-2">
              {knownDegradations.length > 0 ? knownDegradations.map(item => (
                <div key={`${item.domain}-${item.issue}`} className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-2 text-[12px]">
                  <div className="font-semibold uppercase tracking-[0.08em] text-amber-300">{item.domain}</div>
                  <div className="mt-1 text-slate-300">{item.issue}</div>
                </div>
              )) : <div className="text-[12px] text-slate-500">No degradations registered.</div>}
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Warnings / unsupported</div>
            <div className="mt-2 space-y-2 text-[12px]">
              {documentWarningPreview.length > 0 ? documentWarningPreview.map((warning, index) => (
                <div key={`${warning}-${index}`} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-2 text-slate-300">{warning}</div>
              )) : <div className="text-slate-500">No document warnings recorded.</div>}
              {unsupportedTypeEntries.length > 0 ? (
                <div className="rounded border border-slate-700 bg-slate-900/70 px-2 py-2 text-slate-300">
                  {unsupportedTypeEntries.map(([type, count]) => `${type}: ${count}`).join(' · ')}
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        '1 1 0',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="flex h-full flex-col">
      {renderPaletteItem(
        'Activity',
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Object graph</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
              <div>Insert relations: <span className="text-slate-100">{axObjectGraph?.insertRelations.length ?? 0}</span></div>
              <div>Annotation relations: <span className="text-slate-100">{axObjectGraph?.annotationRelations.length ?? 0}</span></div>
              <div>Block instances: <span className="text-slate-100">{blockInstances.length}</span></div>
              <div>Xrefs tracked: <span className="text-slate-100">{xrefs.length}</span></div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Migration controller</div>
            <div className="mt-2 space-y-2 text-[12px]">
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                <span>Engine render</span>
                <span className={axMigrationController?.useEngineRender ? 'text-emerald-300' : 'text-slate-500'}>{axMigrationController?.useEngineRender ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                <span>Legacy compatibility</span>
                <span className={axMigrationController?.useLegacyCompatibility ? 'text-amber-300' : 'text-slate-500'}>{axMigrationController?.useLegacyCompatibility ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Performance runtime</div>
            <div className="mt-2 space-y-2 text-[12px]">
              {runtimeFlags.map(([label, enabled]) => (
                <div key={label} className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <span>{label}</span>
                  <span className={enabled ? 'text-emerald-300' : 'text-slate-500'}>{enabled ? 'On' : 'Off'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-sm border border-slate-700/70 bg-[#20262f] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Insert / annotation preview</div>
            <div className="mt-2 space-y-2 text-[12px] text-slate-300">
              {axObjectGraph?.insertRelations.slice(0, 3).map(relation => (
                <div key={relation.entityId} className="rounded border border-slate-700 bg-slate-900/70 px-2 py-2">
                  <div className="font-semibold text-slate-100">{relation.blockName}</div>
                  <div>Nested inserts: {relation.nestedInsertCount ?? 0}</div>
                  <div>Resolved: {relation.hasResolvedBlock ? 'Yes' : 'No'}</div>
                </div>
              ))}
              {axObjectGraph?.insertRelations.length ? null : <div className="text-slate-500">No insert relations captured yet.</div>}
            </div>
          </div>
        </div>,
        '1 1 0',
        '100px',
        '0px'
      )}
    </div>
  );

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'properties': return renderProperties();
      case 'dimstyle': return renderDimstyle();
      case 'layers': return renderLayers();
      case 'blocks': return renderBlocks();
      case 'xrefs': return renderXrefs();
      case 'traces': return renderTraces();
      case 'activity': return renderActivity();
      default: return null;
    }
  };

  return (
    <aside className="sc-bRKDuR bCZExY sc-gpJgFH sc-bLNRsm cYFsDU NDtpa flex shrink-0 flex-col" style={{ backgroundColor: shellBg, color: textPrimary, boxSizing: 'border-box', order: 0, position: 'relative', pointerEvents: 'all', zIndex: 30, fontSize: '16px', fontWeight: 'unset', lineHeight: 'unset', fontFamily: 'ArtifaktElement,Arial,sans-serif' }}>
      <div className="sc-lltPWG bSjSPy flex h-full min-w-0">
        <div className="sc-fLlhyt iCVNjU flex h-full w-[72px] shrink-0 flex-col items-center justify-start border-r" style={{ borderColor }}>
          <button
            onClick={onToggleOpen}
            className="flex h-[42px] w-full items-center justify-center border-b text-slate-400 hover:bg-slate-700/50 hover:text-white"
            style={{ borderColor }}
          >
            {isOpen ? '‹' : '›'}
          </button>
          <div className="sc-jHmIQB sc-iatjZy hRHwtc cXSrMw flex flex-col gap-0">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (isOpen && active) {
                      onToggleOpen();
                      return;
                    }
                    if (!isOpen) onToggleOpen();
                    onTabChange(tab.id);
                  }}
                  className={`sc-bRKDuR bCZExY sc-kpYCqR relative flex flex-col items-center overflow-hidden px-0 py-0 ${active ? 'kTwxlb' : 'bWxUit'}`}
                  data-testid="side-bar-button"
                  id={tab.label === 'Xrefs' ? 'XREF' : tab.label}
                  style={{
                    border: active ? `1px solid rgba(97, 175, 254, 0.45)` : '1px solid transparent',
                    backgroundColor: active ? 'rgba(97, 175, 254, 0.10)' : 'transparent',
                    color: active ? '#eaf4ff' : textMuted,
                    width: 72,
                    minWidth: 72,
                    maxWidth: 72,
                    height: 79.99,
                    minHeight: 79.99,
                    maxHeight: 79.99,
                    flex: '0 0 79.99px',
                    alignSelf: 'center',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    transition: 'background-color 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms cubic-bezier(0.22, 1, 0.36, 1), color 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <div className="sc-bRKDuR sc-kSzkUS bCZExY gmCfPB absolute left-1/2 top-[14px] -translate-x-1/2">
                    <div data-testid="default-base-icon" className="sc-ggWZvA jcZCTW flex h-6 w-6 items-center justify-center" style={{ opacity: 1 }}>
                      <div className="text-[0] leading-none" style={{ opacity: active ? 1 : 0.92, color: active ? '#ffffff' : '#d7e3f2', transition: 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), color 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}>{tab.icon}</div>
                    </div>
                  </div>
                  <div className="MuiTypography-root MuiTypography-caption css-1eaz7er absolute bottom-[12px] left-0 w-full px-[6px] text-center">
                    <canvas className="sc-dntSTA bZrwOA" />
                    <div className="sc-kvnevz bKUSEH sc-iXCtrC sc-fQhoEj hdIvMn kJwnMQ text-[11px] leading-[14px] whitespace-nowrap" data-text={tab.short} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center', transition: 'color 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}>{tab.short}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="sc-eSYfmf dUdCqS" />
        </div>
        <div className="sc-bjzMPS cEqkTO panel flex min-w-0 flex-1 overflow-hidden" style={{ width: isOpen ? 356 : 0, opacity: isOpen ? 1 : 0, backgroundColor: panelBg, transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)', pointerEvents: isOpen ? 'all' : 'none' }}>
          {isOpen ? (
            <div className="sc-fWMeal dOYQrn flex min-w-0 flex-1 flex-col" style={{ padding: '0 0 0 0', transform: isOpen ? 'translateX(0)' : 'translateX(-10px)', opacity: isOpen ? 1 : 0, transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
              {renderActivePanel()}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default SidebarPanels;
