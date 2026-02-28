import React, { useEffect, useState } from 'react';

interface NestingAXFrameProps {
  isActive?: boolean;
}

const NestingAXFrame: React.FC<NestingAXFrameProps> = ({ isActive = false }) => {
  const [iframeSrc] = useState('http://localhost:5174');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isActive) {
      setIsLoading(true);
    }
  }, [isActive]);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-300 text-sm">Loading NESTING AX...</p>
          </div>
        </div>
      )}
      <iframe
        src={iframeSrc}
        title="NESTING AX Tool"
        className="w-full h-full border-0 bg-black"
        onLoad={() => setIsLoading(false)}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
};

export default NestingAXFrame;
