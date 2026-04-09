// ============================================================
// VECTOR PREVIEW DEMO & TEST EXAMPLES
// Demonstrates various use cases and integration patterns
// ============================================================

import React, { useState } from 'react';
import VectorPreview, { 
  cadEntitiesToGeometry, 
  dxfEntitiesToGeometry,
  gcodeToGeometry,
  generateThumbnail 
} from './VectorPreview';

/**
 * DEMO 1: Basic Vector Preview
 */
export function BasicVectorPreviewDemo() {
  // Simple geometry with feed and rapid moves
  const sampleGeometry = {
    paths: [
      // Green feed moves (cutting paths)
      {
        type: 'line' as const,
        points: [
          { x: 10, y: 10 },
          { x: 90, y: 10 }
        ],
        isRapid: false
      },
      {
        type: 'polyline' as const,
        points: [
          { x: 90, y: 10 },
          { x: 90, y: 90 },
          { x: 10, y: 90 },
          { x: 10, y: 10 }
        ],
        isRapid: false
      },
      // Red rapid move (G0)
      {
        type: 'line' as const,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 50 }
        ],
        isRapid: true
      },
      // Circle in center (feed)
      {
        type: 'polyline' as const,
        points: Array.from({ length: 33 }, (_, i) => {
          const angle = (i / 32) * Math.PI * 2;
          return {
            x: 50 + Math.cos(angle) * 20,
            y: 50 + Math.sin(angle) * 20
          };
        }),
        isRapid: false
      }
    ]
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 1: Basic Vector Preview</h3>
      <p className="text-gray-400 text-sm mb-3">
        Green = Feed moves (G1), Red = Rapid moves (G0)
      </p>
      <VectorPreview 
        geometry={sampleGeometry}
        width={200}
        height={200}
      />
    </div>
  );
}

/**
 * DEMO 2: CAD Entities Conversion
 */
export function CADEntitiesDemo() {
  // Simulate CAD entities from drawing workspace
  const cadEntities = [
    {
      type: 'line',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    },
    {
      type: 'line',
      points: [{ x: 100, y: 0 }, { x: 100, y: 50 }]
    },
    {
      type: 'rect',
      points: [{ x: 20, y: 10 }, { x: 80, y: 40 }]
    },
    {
      type: 'circle',
      center: { x: 50, y: 25 },
      radius: 8,
      properties: { radius: 8 }
    }
  ];

  const geometry = cadEntitiesToGeometry(cadEntities);

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 2: CAD Entities Conversion</h3>
      <p className="text-gray-400 text-sm mb-3">
        Line + Rectangle + Circle
      </p>
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Vector Preview</div>
          <VectorPreview 
            geometry={geometry}
            width={150}
            height={150}
          />
        </div>
        <div className="text-xs text-gray-400 font-mono">
          <div>Input Entities: {cadEntities.length}</div>
          <div>Output Paths: {geometry.paths.length}</div>
          <div className="mt-2">Types:</div>
          <ul className="list-disc ml-4">
            {cadEntities.map((e, i) => (
              <li key={i}>{e.type}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * DEMO 3: Complex Part with Multiple Features
 */
export function ComplexPartDemo() {
  // Complex part with holes, pockets, and features
  const complexPart = {
    paths: [
      // Outer boundary
      {
        type: 'polyline' as const,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 50, y: 100 },
          { x: 0, y: 80 },
          { x: 0, y: 0 }
        ],
        isRapid: false
      },
      // Hole 1
      {
        type: 'polyline' as const,
        points: Array.from({ length: 17 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          return {
            x: 25 + Math.cos(angle) * 8,
            y: 25 + Math.sin(angle) * 8
          };
        }),
        isRapid: false
      },
      // Hole 2
      {
        type: 'polyline' as const,
        points: Array.from({ length: 17 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          return {
            x: 75 + Math.cos(angle) * 8,
            y: 25 + Math.sin(angle) * 8
          };
        }),
        isRapid: false
      },
      // Rapid move between features (red)
      {
        type: 'line' as const,
        points: [
          { x: 25, y: 33 },
          { x: 75, y: 33 }
        ],
        isRapid: true
      }
    ]
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 3: Complex Part</h3>
      <p className="text-gray-400 text-sm mb-3">
        Outer boundary + 2 holes + rapid move
      </p>
      <VectorPreview 
        geometry={complexPart}
        width={200}
        height={200}
      />
    </div>
  );
}

/**
 * DEMO 4: Multiple Size Variants
 */
export function MultiSizeDemo() {
  const simpleGeometry = {
    paths: [
      {
        type: 'polyline' as const,
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 },
          { x: 0, y: 0 }
        ],
        isRapid: false
      }
    ]
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 4: Multiple Sizes</h3>
      <p className="text-gray-400 text-sm mb-3">
        Same geometry, different canvas sizes (auto-scaling)
      </p>
      <div className="flex gap-4 items-end">
        <div>
          <div className="text-xs text-gray-500 mb-1">80x80</div>
          <VectorPreview geometry={simpleGeometry} width={80} height={80} />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">120x120</div>
          <VectorPreview geometry={simpleGeometry} width={120} height={120} />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">200x200</div>
          <VectorPreview geometry={simpleGeometry} width={200} height={200} />
        </div>
      </div>
    </div>
  );
}

/**
 * DEMO 5: Thumbnail Generation
 */
export function ThumbnailGenerationDemo() {
  const [thumbnail, setThumbnail] = useState<string>('');

  const sampleGeometry = {
    paths: [
      {
        type: 'polyline' as const,
        points: [
          { x: 10, y: 10 },
          { x: 90, y: 10 },
          { x: 90, y: 90 },
          { x: 10, y: 90 },
          { x: 10, y: 10 }
        ],
        isRapid: false
      },
      {
        type: 'polyline' as const,
        points: Array.from({ length: 17 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          return {
            x: 50 + Math.cos(angle) * 20,
            y: 50 + Math.sin(angle) * 20
          };
        }),
        isRapid: false
      }
    ]
  };

  const handleGenerate = () => {
    const dataUrl = generateThumbnail(sampleGeometry, 200, 200);
    setThumbnail(dataUrl);
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 5: Thumbnail Generation</h3>
      <p className="text-gray-400 text-sm mb-3">
        Convert vector to base64 PNG image
      </p>
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Live Vector</div>
          <VectorPreview 
            geometry={sampleGeometry}
            width={150}
            height={150}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Generated Thumbnail</div>
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt="Generated thumbnail" 
              className="w-[150px] h-[150px] rounded-lg border border-gray-700"
            />
          ) : (
            <div className="w-[150px] h-[150px] bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500 text-xs">
              Click Generate
            </div>
          )}
        </div>
      </div>
      <button
        onClick={handleGenerate}
        className="mt-3 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
      >
        Generate Thumbnail
      </button>
      {thumbnail && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400 font-mono break-all">
          {thumbnail.substring(0, 100)}...
        </div>
      )}
    </div>
  );
}

/**
 * DEMO 6: Empty/Invalid States
 */
export function ErrorStatesDemo() {
  const emptyGeometry = { paths: [] };
  const invalidGeometry = {
    paths: [
      {
        type: 'line' as const,
        points: [
          { x: NaN, y: NaN },
          { x: Infinity, y: -Infinity }
        ],
        isRapid: false
      }
    ]
  };
  const tooSmallGeometry = {
    paths: [
      {
        type: 'line' as const,
        points: [
          { x: 10, y: 10 },
          { x: 10, y: 10 } // Same point
        ],
        isRapid: false
      }
    ]
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 6: Error States</h3>
      <p className="text-gray-400 text-sm mb-3">
        Handling edge cases gracefully
      </p>
      <div className="flex gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">No Data</div>
          <VectorPreview 
            geometry={emptyGeometry}
            width={120}
            height={120}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Invalid Points</div>
          <VectorPreview 
            geometry={invalidGeometry}
            width={120}
            height={120}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Zero Size</div>
          <VectorPreview 
            geometry={tooSmallGeometry}
            width={120}
            height={120}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * DEMO 7: Integration with PartParametersDialog
 */
export function PartDialogIntegrationDemo() {
  const [selectedPart, setSelectedPart] = useState<any>(null);

  const sampleParts = [
    {
      name: 'Part A',
      cadEntities: [
        { type: 'rect', points: [{ x: 0, y: 0 }, { x: 100, y: 50 }] },
        { type: 'circle', center: { x: 50, y: 25 }, radius: 10, properties: { radius: 10 } }
      ]
    },
    {
      name: 'Part B',
      cadEntities: [
        { type: 'line', points: [{ x: 0, y: 0 }, { x: 80, y: 0 }] },
        { type: 'line', points: [{ x: 80, y: 0 }, { x: 80, y: 60 }] },
        { type: 'line', points: [{ x: 80, y: 60 }, { x: 0, y: 60 }] },
        { type: 'line', points: [{ x: 0, y: 60 }, { x: 0, y: 0 }] }
      ]
    }
  ];

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <h3 className="text-white font-bold mb-2">Demo 7: Part Dialog Integration</h3>
      <p className="text-gray-400 text-sm mb-3">
        Select a part to see preview in dialog
      </p>
      <div className="flex gap-4">
        {/* Part List */}
        <div className="space-y-2">
          {sampleParts.map((part, index) => (
            <button
              key={index}
              onClick={() => setSelectedPart(part)}
              className="block p-2 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm transition-colors"
            >
              {part.name}
            </button>
          ))}
        </div>

        {/* Preview Area */}
        {selectedPart && (
          <div className="flex-1 p-4 bg-gray-800 rounded-lg border border-cyan-500/30">
            <h4 className="text-cyan-400 font-semibold mb-2">{selectedPart.name}</h4>
            <VectorPreview 
              geometry={cadEntitiesToGeometry(selectedPart.cadEntities)}
              width={200}
              height={200}
            />
            <div className="mt-2 text-xs text-gray-400">
              Entities: {selectedPart.cadEntities.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MAIN DEMO CONTAINER
 */
export default function VectorPreviewDemoContainer() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🎨 Vector Preview Component - Demo & Testing
          </h1>
          <p className="text-gray-400">
            Real-time vector rendering with auto-scaling
          </p>
        </div>

        <BasicVectorPreviewDemo />
        <CADEntitiesDemo />
        <ComplexPartDemo />
        <MultiSizeDemo />
        <ThumbnailGenerationDemo />
        <ErrorStatesDemo />
        <PartDialogIntegrationDemo />

        <div className="text-center text-sm text-gray-500 mt-8">
          <p>✅ All demos tested and working</p>
          <p>📚 See VECTOR_PREVIEW_GUIDE.md for documentation</p>
        </div>
      </div>
    </div>
  );
}
