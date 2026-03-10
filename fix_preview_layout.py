import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the "Live Preview" small box inside the KẾT QUẢ PHÂN TÍCH section
small_preview_block = """{videoExportState === 'rendering' && (
    <div className="w-full mb-3 p-2 bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-inner flex flex-col items-center gap-1">
        <div className="w-full aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative" ref={videoPreviewRef}>
            <Activity className="animate-spin text-slate-500 absolute" size={24} />
        </div>
        <div className="text-[9px] text-slate-400 font-mono tracking-widest mt-1 animate-pulse">LIVE PREVIEW</div>
    </div>
)}"""

content = content.replace(small_preview_block, "")


# 2. Attach the `ref={videoPreviewRef}` to the "tầm trung" preview canvas container instead
# 3. Remove the big play/pause button overlay from that "tầm trung" preview
medium_preview_old = """        <div className="bg-black/50 rounded-lg border border-white/10 p-2 overflow-hidden aspect-video relative flex items-center justify-center group mt-4">
            {!isPlaying ? (
                <button onClick={() => { simState.current.index = 0; simState.current.progress = 0; setCurrentIndex(0); setIsPlaying(true); }} className="absolute z-10 w-12 h-12 bg-blue-600/80 hover:bg-blue-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all group-hover:scale-110">
                    <Play size={20} className="ml-1" fill="currentColor" />
                </button>
            ) : (
                <button onClick={() => setIsPlaying(false)} className="absolute z-10 w-12 h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all group-hover:scale-110">
                    <Pause size={20} fill="currentColor" />
                </button>
            )}
            {isPlaying && (
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-[8px] font-mono text-green-400 flex items-center gap-1 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    PLAYING: {Math.floor((currentIndex / Math.max(1, commands.length)) * 100)}%
                </div>
            )}
            <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ pointerEvents: 'auto' }}>
                <Canvas 
                    camera={{ position: [50, -50, 50], fov: 45, far: 100000, near: 0.1 }} 
                    dpr={1} 
                    gl={{ powerPreference: gpuPreference, antialias: true, stencil: false, depth: true }}
                >
                    <color attach="background" args={[theme.background]} />
                    <UpdateMiniCamera cameraRef={miniCameraRef} />
                    <SceneContent orbitParams={{ zoomSpeed: 0.5, panSpeed: 0.5, rotateSpeed: 0.5 }} 
                        commands={commands} currentCmd={currentCmd} interpolatedPosRef={interpolatedPosRef} 
                        theme={theme} toolConfig={toolConfig} showGrid={showGrid} snapMode={snapMode} 
                        measurePoints={[]} setMeasurePoints={() => {}} currentIndex={currentIndex} 
                        viewMode={viewMode} viewOptions={viewOptions} starMode={starMode} 
                        zoomFitTrigger={zoomFitTrigger} onSegmentClick={() => {}} isLiteMode={false} 
                    />
                </Canvas>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75 pointer-events-none" style={{ width: `${(currentIndex / Math.max(1, commands.length)) * 100}%` }}></div>
        </div>"""

medium_preview_new = """        <div className="bg-black/50 rounded-lg border border-white/10 p-2 overflow-hidden aspect-video relative flex items-center justify-center mt-4">
            {videoExportState === 'rendering' && (
                <div className="absolute top-2 right-2 z-10 bg-black/80 px-2 py-1 rounded text-[8px] font-mono text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                    <Activity size={10} className="animate-spin" />
                    EXPORTING: {Math.floor(videoExportProgress * 100)}%
                </div>
            )}
            {isPlaying && videoExportState !== 'rendering' && (
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-[8px] font-mono text-green-400 flex items-center gap-1 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    PLAYING: {Math.floor((currentIndex / Math.max(1, commands.length)) * 100)}%
                </div>
            )}
            <div ref={videoPreviewRef} className="absolute inset-0 rounded-lg overflow-hidden" style={{ pointerEvents: 'auto' }}>
                {videoExportState !== 'rendering' && (
                  <Canvas 
                      camera={{ position: [50, -50, 50], fov: 45, far: 100000, near: 0.1 }} 
                      dpr={1} 
                      gl={{ powerPreference: gpuPreference, antialias: true, stencil: false, depth: true }}
                  >
                      <color attach="background" args={[theme.background]} />
                      <UpdateMiniCamera cameraRef={miniCameraRef} />
                      <SceneContent orbitParams={{ zoomSpeed: 0.5, panSpeed: 0.5, rotateSpeed: 0.5 }} 
                          commands={commands} currentCmd={currentCmd} interpolatedPosRef={interpolatedPosRef} 
                          theme={theme} toolConfig={toolConfig} showGrid={showGrid} snapMode={snapMode} 
                          measurePoints={[]} setMeasurePoints={() => {}} currentIndex={currentIndex} 
                          viewMode={viewMode} viewOptions={viewOptions} starMode={starMode} 
                          zoomFitTrigger={zoomFitTrigger} onSegmentClick={() => {}} isLiteMode={false} 
                      />
                  </Canvas>
                )}
            </div>
            {videoExportState !== 'rendering' && (
              <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75 pointer-events-none" style={{ width: `${(currentIndex / Math.max(1, commands.length)) * 100}%` }}></div>
            )}
        </div>"""

content = content.replace(medium_preview_old, medium_preview_new)

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)
