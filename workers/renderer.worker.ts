import * as THREE from 'three';

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let batchMesh: any; // BatchedMesh
let targetCameraPos = { x: 0, y: 0, zoom: 1 };
let partMap = new Map();

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            init(payload.canvas, payload.width, payload.height, payload.pixelRatio);
            break;
        case 'RESIZE':
            resize(payload.width, payload.height);
            break;
        case 'UPDATE_OBJECTS':
            updateObjects(payload.objects);
            break;
        case 'PAN_ZOOM':
            updateCamera(payload);
            break;
    }
};

function init(canvas: OffscreenCanvas, width: number, height: number, pixelRatio: number) {
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: false, 
        powerPreference: 'high-performance',
        alpha: false
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#020205');

    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    camera.position.z = 500;
// 🚀 AUTOCAD SUPREME V9: PRECISION SHADER ENGINE
const LineShader = {
    uniforms: {
        uColor: { value: new THREE.Color('#00ff00') },
        uZoom: { value: 1.0 },
        uThickness: { value: 1.2 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        void main() {
            gl_FragColor = vec4(uColor, 1.0);
        }
    `
};

function animate() {
    requestAnimationFrame(animate);
    
    // 🚀 SUB-FRAME INTERPOLATION (Smooth Camera Physics)
    if (camera && targetCameraPos) {
        camera.position.x += (targetCameraPos.x - camera.position.x) * 0.2;
        camera.position.y += (targetCameraPos.y - camera.position.y) * 0.2;
        camera.zoom += (targetCameraPos.zoom - camera.zoom) * 0.2;
        camera.updateProjectionMatrix();
    }
    
    renderer.render(scene, camera);
}

 

    // Grid
    const grid = new THREE.GridHelper(10000, 100, 0x1e293b, 0x0f172a);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    animate();
}

function updateObjects(objects: any[]) {
    if (batchMesh) {
        scene.remove(batchMesh);
        batchMesh.dispose();
    }

    let totalVertices = 0;
    objects.forEach(obj => { 
        if (obj.packedBuffer) totalVertices += (obj.packedBuffer.byteLength / 12);
        if (obj.proxyBuffer) totalVertices += 8; // Bounding box points
    });

    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 });
    
    // Allocate 2 slots per part: one for Real, one for Proxy
    // @ts-ignore
    batchMesh = new THREE.BatchedMesh(objects.length * 2, totalVertices, totalVertices * 2, material);
    batchMesh.frustumCulled = false;

    partMap.clear();

    objects.forEach((obj, i) => {
        const color = new THREE.Color(obj.color || "#00ff00");
        
        // A. REAL GEOMETRY
        if (obj.packedBuffer) {
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(obj.packedBuffer), 3));
            const colors = new Float32Array((obj.packedBuffer.byteLength / 12) * 3);
            for(let j=0; j<colors.length; j+=3) { colors[j]=color.r; colors[j+1]=color.g; colors[j+2]=color.b; }
            geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const realId = batchMesh.addGeometry(geom);
            partMap.set(`${obj.id}_real`, realId);
        }

        // B. PROXY GEOMETRY (Bounding Box)
        if (obj.proxyBuffer) {
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(obj.proxyBuffer), 3));
            const colors = new Float32Array(8 * 3);
            for(let j=0; j<colors.length; j+=3) { colors[j]=color.r; colors[j+1]=color.g; colors[j+2]=color.b; }
            geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const proxyId = batchMesh.addGeometry(geom);
            partMap.set(`${obj.id}_proxy`, proxyId);
        }

        const matrix = new THREE.Matrix4().makeRotationZ((obj.rotation * Math.PI) / 180).setPosition(obj.x, obj.y, 0);
        const rId = partMap.get(`${obj.id}_real`);
        const pId = partMap.get(`${obj.id}_proxy`);
        if (rId !== undefined) batchMesh.setMatrixAt(rId, matrix);
        if (pId !== undefined) batchMesh.setMatrixAt(pId, matrix);
    });

    scene.add(batchMesh);
    currentObjects = objects;
}

let currentObjects: any[] = [];
let lastUseProxy = false;



function updateCamera(payload: any) {
    if (!camera) return;
    targetCameraPos.x = payload.x;
    targetCameraPos.y = payload.y;
    targetCameraPos.zoom = payload.zoom;
}

function resize(width: number, height: number) {
    renderer.setSize(width, height, false);
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    camera.updateProjectionMatrix();
}

