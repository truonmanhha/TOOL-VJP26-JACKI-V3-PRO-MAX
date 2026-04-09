import React, { useMemo, useState } from 'react';
import { CadEntity, Layer } from './services/db';

interface RightPanelProps {
  selectedEntities: CadEntity[];
  allEntities: CadEntity[];
  layers: Layer[];
  onUpdateSelectedProperties?: (updates: Record<string, unknown>) => void;
  onEntityLayerAssign?: (entityIds: string[], layerId: string) => void;
}

interface PropGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const PropGroup: React.FC<PropGroupProps> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="acad-prop-group">
      <button className={`acad-accordion-header ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
};

const RightPanel: React.FC<RightPanelProps> = ({
  selectedEntities,
  allEntities,
  layers,
  onUpdateSelectedProperties,
  onEntityLayerAssign
}) => {
  const selectedLayerIds = useMemo(
    () => Array.from(new Set(selectedEntities.map(e => e.layerId).filter(Boolean))),
    [selectedEntities]
  );

  const getCommonValue = (key: string, fallback = '—') => {
    if (selectedEntities.length === 0) return fallback;
    const values = selectedEntities.map(e => (e as any)[key] ?? e.properties?.[key]);
    const present = values.filter(v => v !== undefined && v !== null && v !== '');
    if (present.length === 0) return fallback;
    const first = present[0];
    return present.every(v => v === first) ? String(first) : 'Varies';
  };

  const handleUpdate = (field: string, value: string) => {
    if (field === 'layerId' && onEntityLayerAssign) {
      onEntityLayerAssign(selectedEntities.map(e => e.id), value);
      return;
    }
    if (onUpdateSelectedProperties) {
      const numFields = new Set(['rotation', 'scale', 'x', 'y']);
      onUpdateSelectedProperties({ [field]: numFields.has(field) ? Number(value) : value });
    }
  };

  const renderRow = (label: string, value: string, editable = false, field?: string, options?: string[]) => (
    <div className="acad-prop-row">
      <div className="acad-prop-label">{label}</div>
      <div style={{ textAlign: 'right' }}>
        {editable && field ? (
          options ? (
            <select 
              value={value === 'Varies' ? '' : value}
              onChange={(e) => handleUpdate(field, e.target.value)}
              className="acad-prop-input"
            >
              {value === 'Varies' && <option value="" disabled>Varies</option>}
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input 
              type="text"
              value={value === 'Varies' ? '' : value}
              onChange={(e) => handleUpdate(field, e.target.value)}
              placeholder={value === 'Varies' ? 'Varies' : ''}
              className="acad-prop-input"
            />
          )
        ) : (
          <span className="acad-prop-value">{value}</span>
        )}
      </div>
    </div>
  );

  return (
    <aside style={{ width: '280px', backgroundColor: 'var(--acad-sidebar)', borderLeft: '1px solid var(--acad-border)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0, zIndex: 30, userSelect: 'none', fontFamily: 'ArtifaktElement, Arial, sans-serif' }}>
      <div style={{ height: '32px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--acad-border)', backgroundColor: 'var(--acad-header)' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--acad-text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Properties</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
        {selectedEntities.length === 0 ? (
          <>
            <PropGroup title="Model">
              {renderRow('Drawing', `${allEntities.length} entities`)}
              {renderRow('Selection', '0 selected')}
            </PropGroup>
            
            <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--acad-text-muted)', padding: '16px', textAlign: 'center' }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ opacity: 0.15, marginBottom: '8px' }}>
                <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
              </svg>
              <p style={{ fontSize: '12px' }}>Select entities to view properties</p>
            </div>
          </>
        ) : (
          <>
            <PropGroup title="General" defaultOpen={true}>
              {renderRow('Type', getCommonValue('type', '—'))}
              {renderRow('Layer', 
                selectedLayerIds.length === 1 ? (layers.find(l => l.id === selectedLayerIds[0])?.name || '0') : 'Varies',
                true, 'layerId', layers.map(l => l.id)
              )}
              {renderRow('Color', getCommonValue('color', '#ffffff'))}
              {renderRow('Linetype', 'ByLayer')}
              {renderRow('Lineweight', 'ByLayer')}
            </PropGroup>

            <PropGroup title="Geometry" defaultOpen={true}>
              {renderRow('Position X', getCommonValue('x', '0'), true, 'x')}
              {renderRow('Position Y', getCommonValue('y', '0'), true, 'y')}
              {renderRow('Rotation', getCommonValue('rotation', '0'), true, 'rotation')}
              {renderRow('Scale', getCommonValue('scale', '1'), true, 'scale')}
            </PropGroup>

            <PropGroup title="Misc" defaultOpen={false}>
              {renderRow('Objects', `${selectedEntities.length}`)}
              {renderRow('Distinct layers', `${selectedLayerIds.length}`)}
              {renderRow('Handle', selectedEntities.length === 1 ? selectedEntities[0].id.substring(0, 8) : 'Multiple')}
            </PropGroup>
          </>
        )}
      </div>
    </aside>
  );
};

export default RightPanel;