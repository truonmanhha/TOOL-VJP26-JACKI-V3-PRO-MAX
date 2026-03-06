import React from 'react';
import { AppSettings } from '../../types';

export const renderGeneralSVG = (method: string) => {
  let content = null;
  
  if (method === 'Rectangular') {
    content = (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="70" height="50" fill="none" stroke="#76ff03" strokeWidth="2" />
        <rect x="110" y="20" width="70" height="50" fill="none" stroke="#76ff03" strokeWidth="2" />
        <rect x="20" y="80" width="70" height="50" fill="none" stroke="#76ff03" strokeWidth="2" />
        <rect x="110" y="80" width="70" height="50" fill="none" stroke="#76ff03" strokeWidth="2" />
      </svg>
    );
  } else if (method === 'Original') {
    content = (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <path d="M30,30 L90,30 L90,80 L60,80 L60,120 L30,120 Z" fill="none" stroke="#76ff03" strokeWidth="2" />
        <path d="M110,30 L170,30 L170,80 L140,80 L140,120 L110,120 Z" fill="none" stroke="#76ff03" strokeWidth="2" />
      </svg>
    );
  } else if (method === 'VeroNester') {
    content = (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,10 L190,10 L190,140 L10,140 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M20,20 L100,20 L100,60 L60,60 L60,100 L20,100 Z" fill="none" stroke="#76ff03" strokeWidth="2" />
        <rect x="65" y="25" width="30" height="30" fill="none" stroke="#76ff03" strokeWidth="2" />
        <circle cx="80" cy="80" r="15" fill="none" stroke="#76ff03" strokeWidth="2" />
        <rect x="110" y="20" width="70" height="40" fill="none" stroke="#76ff03" strokeWidth="2" />
        <path d="M110,70 L180,70 L180,130 L145,130 L145,100 L110,100 Z" fill="none" stroke="#76ff03" strokeWidth="2" />
        <circle cx="162" cy="115" r="10" fill="none" stroke="#76ff03" strokeWidth="2" />
      </svg>
    );
  } else {
    // Default/TrueShape
    content = (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,20 L80,20 L80,50 L50,50 L50,90 L20,90 Z" fill="none" stroke="#76ff03" strokeWidth="2"></path>
        <circle cx="30" cy="30" r="3" fill="#76ff03"></circle>
        <path d="M90,20 L180,20 L180,130 L150,130 L150,50 L90,50 Z" fill="none" stroke="#76ff03" strokeWidth="2"></path>
        <circle cx="165" cy="35" r="3" fill="#76ff03"></circle>
        <path d="M20,100 L80,100 L80,130 L20,130 Z" fill="none" stroke="#76ff03" strokeWidth="2"></path>
      </svg>
    );
  }
  
  return (
    <div className="relative w-full aspect-[4/3] max-w-[200px] flex items-center justify-center bg-slate-800 rounded shadow-inner p-2 border border-slate-600">
      <div className="absolute inset-2 border-2 border-yellow-400 opacity-80 pointer-events-none"></div>
      {content}
    </div>
  );
};

export const renderEngineSVG = (packTo: string, customAngle: number) => {
  // Map packTo to explicit transform translates for smooth animation
  let tx = "0%";
  let ty = "0%";
  
  // If the inner div is 50% of parent, then max translate is 100% of its own size to reach the other side.
  // Halfway is 50%.
  
  if (packTo === "TL") { tx = "0%"; ty = "0%"; }
  else if (packTo === "T") { tx = "50%"; ty = "0%"; }
  else if (packTo === "TR") { tx = "100%"; ty = "0%"; }
  else if (packTo === "L") { tx = "0%"; ty = "50%"; }
  else if (packTo === "Custom") { tx = "50%"; ty = "50%"; }
  else if (packTo === "R") { tx = "100%"; ty = "50%"; }
  else if (packTo === "BL") { tx = "0%"; ty = "100%"; }
  else if (packTo === "B") { tx = "50%"; ty = "100%"; }
  else if (packTo === "BR") { tx = "100%"; ty = "100%"; }

  return (
    <div className="relative w-full aspect-[4/3] max-w-[200px] bg-slate-800 rounded shadow-inner p-2 border border-slate-600 overflow-hidden">
      {/* Sheet Boundary */}
      <div className="absolute inset-2 border-2 border-yellow-400 opacity-80"></div>
      
      {/* Container that shifts the parts */}
      <div className="absolute inset-3 p-1">
         <div 
           className="relative flex flex-wrap gap-1 transition-all duration-700 ease-in-out bg-white/5 border border-white/10 p-1 rounded-sm shadow-xl"
           style={{
             width: '50%', height: '50%',
             transform: `translate(${tx}, ${ty}) ${packTo === 'Custom' ? `rotate(${customAngle}deg)` : 'rotate(0deg)'}`
           }}
         >
            {/* Alphacam-style nested parts cluster */}
            <div className="w-[45%] h-[40%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">1</div>
            <div className="w-[30%] h-[40%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">2</div>
            <div className="w-[20%] h-[40%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">3</div>
            
            <div className="w-[25%] h-[30%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">4</div>
            <div className="w-[50%] h-[30%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">5</div>
            
            <div className="w-[60%] h-[20%] border-2 border-[#76ff03] bg-[#76ff03]/20 flex items-center justify-center text-[#76ff03] text-[10px] font-bold">6</div>
         </div>
      </div>
      
      {/* Custom Angle Indicator */}
      {packTo === "Custom" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
           <svg width="100" height="100" viewBox="-50 -50 100 100">
             <circle cx="0" cy="0" r="40" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
             <line x1="0" y1="0" x2="40" y2="0" stroke="#fff" strokeWidth="1" transform={`rotate(${customAngle})`} />
           </svg>
        </div>
      )}
    </div>
  );
};

export const renderRectEngineSVG = (cutDirection: string, optimizeFor: string) => {
  const isX = cutDirection === 'X' || cutDirection === 'Auto';
  const isY = cutDirection === 'Y' || cutDirection === 'Auto';
  const isSpace = optimizeFor === 'Space';

  return (
    <div className="relative w-full aspect-[4/3] max-w-[200px] bg-slate-800 rounded shadow-inner p-2 border border-slate-600 overflow-hidden">
      <div className="absolute inset-2 border-2 border-yellow-400 opacity-80 z-10"></div>
      
      {/* Dynamic Parts based on optimization type */}
      <div className="absolute inset-3 z-20">
         {isSpace ? (
           // SPACE OPTIMIZED: Parts are interlocked, no straight clear paths
           <>
             <div className="absolute top-1 left-1 w-[60%] h-[40%] border-2 border-[#76ff03] bg-[#76ff03]/10 transition-all duration-500"></div>
             <div className="absolute top-[45%] left-1 w-[40%] h-[50%] border-2 border-[#76ff03] bg-[#76ff03]/10 transition-all duration-500"></div>
             <div className="absolute top-1 right-1 w-[35%] h-[60%] border-2 border-[#76ff03] bg-[#76ff03]/10 transition-all duration-500"></div>
             <div className="absolute bottom-1 right-1 w-[55%] h-[35%] border-2 border-[#76ff03] bg-[#76ff03]/10 transition-all duration-500"></div>
           </>
         ) : (
           // CUTS OPTIMIZED: Parts aligned for Guillotine cuts
           <>
             <div className="absolute top-1 left-1 w-[45%] h-[30%] border-2 border-[#76ff03] bg-[#76ff03]/20 transition-all duration-500"></div>
             <div className="absolute top-1 left-[50%] w-[45%] h-[30%] border-2 border-[#76ff03] bg-[#76ff03]/20 transition-all duration-500"></div>
             
             <div className="absolute top-[35%] left-1 w-[30%] h-[60%] border-2 border-[#76ff03] bg-[#76ff03]/20 transition-all duration-500"></div>
             <div className="absolute top-[35%] left-[35%] w-[60%] h-[25%] border-2 border-[#76ff03] bg-[#76ff03]/20 transition-all duration-500"></div>
             <div className="absolute bottom-1 right-1 w-[60%] h-[30%] border-2 border-[#76ff03] bg-[#76ff03]/20 transition-all duration-500"></div>
           </>
         )}
      </div>

      {/* Guillotine Cut Lines */}
      <div className="absolute inset-2 z-30 pointer-events-none">
        {/* Horizontal cut line */}
        <div className={`absolute top-[35%] left-0 w-full h-[2px] bg-red-500 shadow-[0_0_5px_red] transition-opacity duration-300 ${isX && !isSpace ? 'opacity-100' : 'opacity-0'}`}></div>
        {/* Second Horizontal cut line */}
        <div className={`absolute top-[65%] left-[35%] w-[65%] h-[2px] bg-red-500 shadow-[0_0_5px_red] transition-opacity duration-300 ${isX && !isSpace ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {/* Vertical cut line */}
        <div className={`absolute top-[35%] left-[35%] w-[2px] h-[65%] bg-red-500 shadow-[0_0_5px_red] transition-opacity duration-300 ${isY && !isSpace ? 'opacity-100' : 'opacity-0'}`}></div>
        {/* Full Vertical cut line */}
        <div className={`absolute top-0 left-[48%] w-[2px] h-full bg-red-500 shadow-[0_0_5px_red] transition-opacity duration-300 ${isY && isSpace === false && cutDirection === 'Y' ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>
      
      {/* Alert / Text */}
      <div className="absolute bottom-1 left-0 w-full text-center z-40">
        <span className="text-[9px] font-bold text-slate-400 bg-slate-800/80 px-2 rounded">
          {optimizeFor === 'Cuts' ? 'GUILLOTINE OPTIMIZED' : 'YIELD OPTIMIZED'}
        </span>
      </div>
    </div>
  );
};
