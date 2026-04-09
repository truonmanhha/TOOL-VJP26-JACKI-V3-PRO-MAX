import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, NestList, Part, CadEntity } from './NestingAX/services/db';
import Header from './NestingAX/Header';
import Sidebar from './NestingAX/Sidebar';
import Workspace from './NestingAX/Workspace';
import Footer from './NestingAX/Footer';
import FileDashboard from './NestingAX/FileDashboard';
import CommandsRibbon from './NestingAX/CommandsRibbon';
import './NestingAX/AutocadReal.css';

const NestingAXApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [nestLists, setNestLists] = useState<NestList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [currentParts, setCurrentParts] = useState<Part[]>([]);
  const [allCadEntities, setAllCadEntities] = useState<CadEntity[]>([]);
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);

  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
  const [wsZoom, setWsZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [orthoEnabled, setOrthoEnabled] = useState(false);
  const [activeSnaps, setActiveSnaps] = useState<Set<string>>(new Set(['point', 'midpoint', 'center']));
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());

  // COMMAND LINE STATE (SHARED)
  const [commandInput, setCommandInput] = useState('');
  const [commandPrompt, setCommandPrompt] = useState<string | undefined>();
  const [commandOptions, setCommandOptions] = useState<string[] | undefined>();
  const [lastCommandOptionClicked, setLastCommandOptionClicked] = useState<string | null>(null);

  // Initialization
  useEffect(() => {
    db.init();
    setNestLists(db.getNestLists());
  }, []);

  const reloadData = useCallback(() => {
    if (activeListId) {
      const parts = db.getParts(activeListId);
      setCurrentParts(parts);
      const entities: CadEntity[] = [];
      parts.forEach(p => { if (p.cadEntities) entities.push(...p.cadEntities); });
      setAllCadEntities(entities);
    } else {
      setAllCadEntities([]);
    }
  }, [activeListId]);

  useEffect(() => { reloadData(); }, [reloadData]);

  const handleDXFImportFile = useCallback(async (files?: FileList | File[]) => {
    if (!files) {
      document.getElementById('global-upload-hidden')?.click();
      return;
    }
    const file = files[0];
    const newListId = await db.addNestList({
      name: file.name,
      description: 'AutoCAD Web & Mobile',
      status: 'active'
    });
    setNestLists(db.getNestLists());
    setActiveListId(newListId);
    setCurrentView('editor');
  }, []);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (window.confirm('Delete this drawing?')) {
      db.deleteNestList(id);
      const updated = db.getNestLists();
      setNestLists(updated);
      if (activeListId === id) {
        setActiveListId(null);
        setAllCadEntities([]);
      }
    }
  }, [activeListId]);

  if (currentView === 'dashboard') {
    return (
      <div className="acad-app w-full h-screen overflow-hidden">
        <FileDashboard
          nestLists={nestLists}
          onOpenProject={(id) => { setActiveListId(id); setCurrentView('editor'); }}
          onNewDrawing={() => { setActiveListId(null); setCurrentView('editor'); }}
          onUpload={() => handleDXFImportFile()}
          onFilesDropped={handleDXFImportFile}
          onDeleteProject={handleDeleteProject}
        />
        <input id="global-upload-hidden" type="file" hidden onChange={e => handleDXFImportFile(e.target.files || undefined)} />
      </div>
    );
  }

  return (
    <div className="acad-app flex flex-col flex-1 overflow-hidden bg-[#1a1f25] relative">
      {/* TẦNG 1: HEADER & RIBBON - LUÔN TRÊN CÙNG */}
      <div className="flex-none z-[100] border-b border-[#111820] bg-[#1a1f25]">
        <Header
          onHomeClick={() => setCurrentView('dashboard')}
          onImportDXF={() => handleDXFImportFile()}
          onNewNestList={() => { setActiveListId(null); setAllCadEntities([]); }}
        />
        <CommandsRibbon onSelectTool={setActiveDrawTool} activeTool={activeDrawTool} />
      </div>

      {/* TẦNG 2: MAIN - SIDEBAR VÀ WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar layers={[]} />

        <main className="flex-1 relative bg-[#212830] overflow-hidden">
          <Workspace
            activeDrawTool={activeDrawTool} onSelectTool={setActiveDrawTool}
            snapEnabled={snapEnabled} activeSnaps={activeSnaps as any} orthoEnabled={orthoEnabled}
            onToggleSnap={() => setSnapEnabled(!snapEnabled)} onToggleOrtho={() => setOrthoEnabled(!orthoEnabled)}
            onMouseWorldPos={setMouseWorldPos} onZoomChange={setWsZoom}
            selectedEntityIds={selectedEntityIds}
            commandInput={commandInput} onCommandInputChange={setCommandInput}
            onCommandPromptChange={setCommandPrompt}
            onCommandOptionsChange={setCommandOptions}
            lastCommandOptionClicked={lastCommandOptionClicked}
            onCommandOptionHandled={() => setLastCommandOptionClicked(null)}
            allCadEntities={allCadEntities}
          />
        </main>
      </div>

      <Footer
        x={mouseWorldPos.x} y={mouseWorldPos.y} zoom={wsZoom}
        snapEnabled={snapEnabled} onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        activeSnaps={activeSnaps as any} onToggleSnapMode={() => { }}
        orthoEnabled={orthoEnabled} onToggleOrtho={() => setOrthoEnabled(!orthoEnabled)}
        activeTool={activeDrawTool}
        selectionCount={selectedEntityIds.size}
        commandInput={commandInput} onCommandInputChange={setCommandInput}
        commandPrompt={commandPrompt}
        commandOptions={commandOptions}
        onCommandOptionClick={(opt) => setLastCommandOptionClicked(opt)}
        showDynInput={true}
        showCrosshair={true}
        crosshairSize={100}
        onCloseAllOverlays={() => { /* logic to close panels */ }}
      />
    </div>
  );
};

export default NestingAXApp;
