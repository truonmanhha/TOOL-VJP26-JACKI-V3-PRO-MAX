const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');
code = code.replace(
    /<Canvas \n                    onCreated=\{({ gl }) => {\n                        \/\/ Lưu ref của canvas để có thể record video\n                        \(miniCanvasRef as any\).current = gl.domElement;\n                    }}\n                    camera={{ position: \[50, -50, 50\], fov: 45, far: 100000, near: 0.1 }} dpr={1} gl={{ powerPreference: "low-power", antialias: false, stencil: false, depth: true, preserveDrawingBuffer: true }}>\n                    <color attach="background" args={\['#000000'\]} \/>\n                    <SceneContent \n                        commands={commands} currentCmd={currentCmd} interpolatedPosRef={interpolatedPosRef} theme={{...theme, background: '#000000'}} toolConfig={toolConfig} showGrid={false} snapMode={false} measurePoints={\[\]} setMeasurePoints={() => {}} currentIndex={currentIndex} viewMode={viewMode} viewOptions={viewOptions} starMode={starMode} zoomFitTrigger={zoomFitTrigger} onSegmentClick={() => {}} isLiteMode={true} \n                        viewCubeControllerRef={{current: null}}\n                    \/>\n                <\/Canvas>/g,
    `<Canvas 
        onCreated={({ gl }) => {
            (miniCanvasRef as any).current = gl.domElement;
        }}
        camera={{ position: [50, -50, 50], fov: 45, far: 100000, near: 0.1 }} 
        dpr={1} 
        gl={{ powerPreference: "low-power", antialias: false, stencil: false, depth: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} intensity={0.8} />
        <SceneContent 
            commands={commands} 
            currentCmd={commands[currentIndex] || { line: 0, type: 'OTHER', x: 0, y: 0, z: 0, code: '' }} 
            interpolatedPosRef={interpolatedPosRef} 
            theme={{...theme, background: '#000000'}} 
            toolConfig={toolConfig} 
            showGrid={false} 
            snapMode={false} 
            measurePoints={[]} 
            setMeasurePoints={() => {}} 
            currentIndex={currentIndex} 
            viewMode={viewMode} 
            viewOptions={viewOptions} 
            starMode={starMode} 
            zoomFitTrigger={zoomFitTrigger} 
            onSegmentClick={() => {}} 
            isLiteMode={true} 
            viewCubeControllerRef={{current: null}}
        />
    </Canvas>`
);
fs.writeFileSync('components/GCodeViewer.tsx', code);
