import React from 'react';
import { AppSettings } from '../../types';

export const renderGeneralSVG = (method: string) => {
  if (method === 'Rectangular') {
    return (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="60" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <rect x="100" y="10" width="80" height="60" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <rect x="10" y="80" width="80" height="60" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <rect x="100" y="80" width="80" height="60" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      </svg>
    );
  } else if (method === 'Original') {
    return (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,20 L80,20 L80,80 L50,80 L50,130 L20,130 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <path d="M100,20 L160,20 L160,80 L130,80 L130,130 L100,130 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      </svg>
    );
  } else if (method === 'VeroNester') {
    return (
      <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,10 L190,10 L190,140 L10,140 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M20,20 L100,20 L100,60 L60,60 L60,100 L20,100 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <rect x="65" y="25" width="30" height="30" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <circle cx="80" cy="80" r="15" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <rect x="110" y="20" width="70" height="40" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <path d="M110,70 L180,70 L180,130 L145,130 L145,100 L110,100 Z" fill="none" stroke="#76ff03" strokeWidth="1.5" />
        <circle cx="162" cy="115" r="10" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      </svg>
    );
  }
  
  // Default/TrueShape
  return (
    <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M10,10 L80,10 L80,50 L50,50 L50,90 L10,90 Z" fill="none" stroke="#76ff03" strokeWidth="1.5"></path>
      <circle cx="20" cy="20" r="2" fill="none" stroke="#76ff03" strokeWidth="1.5"></circle>
      <circle cx="70" cy="20" r="2" fill="none" stroke="#76ff03" strokeWidth="1.5"></circle>
      <path d="M90,10 L190,10 L190,140 L160,140 L160,40 L90,40 Z" fill="none" stroke="#76ff03" strokeWidth="1.5"></path>
      <circle cx="180" cy="20" r="2" fill="none" stroke="#76ff03" strokeWidth="1.5"></circle>
      <circle cx="180" cy="130" r="2" fill="none" stroke="#76ff03" strokeWidth="1.5"></circle>
      <path d="M10,100 L80,100 L80,140 L10,140 Z" fill="none" stroke="#76ff03" strokeWidth="1.5"></path>
      <circle cx="20" cy="110" r="2" fill="none" stroke="#76ff03" strokeWidth="1.5"></circle>
    </svg>
  );
};

export const renderEngineSVG = (packTo: string, customAngle: number) => {
  // Base sheet
  const bg = <rect x="20" y="20" width="160" height="110" fill="none" stroke="#FFFF00" strokeWidth="1" strokeDasharray="2 2" />;
  
  let arrowX = 100, arrowY = 75;
  let rotate = 0;

  if (packTo === 'Custom') {
    rotate = customAngle;
  } else {
    switch (packTo) {
      case 'TL': arrowX = 40; arrowY = 40; rotate = -135; break;
      case 'T':  arrowX = 100; arrowY = 40; rotate = -90; break;
      case 'TR': arrowX = 160; arrowY = 40; rotate = -45; break;
      case 'L':  arrowX = 40; arrowY = 75; rotate = 180; break;
      case 'R':  arrowX = 160; arrowY = 75; rotate = 0; break;
      case 'BL': arrowX = 40; arrowY = 110; rotate = 135; break;
      case 'B':  arrowX = 100; arrowY = 110; rotate = 90; break;
      case 'BR': arrowX = 160; arrowY = 110; rotate = 45; break;
    }
  }

  return (
    <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      {bg}
      <g transform={`translate(${arrowX}, ${arrowY}) rotate(${rotate})`}>
        {/* Origin dot */}
        <circle cx="0" cy="0" r="3" fill="#76ff03" />
        {/* Arrow shaft */}
        <line x1="0" y1="0" x2="40" y2="0" stroke="#76ff03" strokeWidth="3" />
        {/* Arrow head */}
        <path d="M30,-10 L45,0 L30,10 Z" fill="#76ff03" />
      </g>
      {/* Some nested blocks conceptually moving towards the pack direction */}
      <rect x="70" y="55" width="20" height="20" fill="none" stroke="#76ff03" strokeWidth="1" opacity="0.5" />
      <rect x="95" y="55" width="15" height="30" fill="none" stroke="#76ff03" strokeWidth="1" opacity="0.5" />
      <rect x="70" y="80" width="20" height="15" fill="none" stroke="#76ff03" strokeWidth="1" opacity="0.5" />
    </svg>
  );
};

export const renderRectEngineSVG = (cutDirection: string, optimizeFor: string) => {
  const isX = cutDirection === 'X' || cutDirection === 'Auto';
  const isY = cutDirection === 'Y';
  
  return (
    <svg className="w-full h-full" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="160" height="110" fill="none" stroke="#FFFF00" strokeWidth="1" strokeDasharray="2 2" />
      
      {/* Draw parts */}
      <rect x="25" y="25" width="40" height="30" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      <rect x="70" y="25" width="50" height="30" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      <rect x="125" y="25" width="50" height="30" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      
      <rect x="25" y="65" width="60" height="25" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      <rect x="90" y="65" width="30" height="25" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      <rect x="125" y="65" width="50" height="60" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      
      <rect x="25" y="100" width="45" height="25" fill="none" stroke="#76ff03" strokeWidth="1.5" />
      <rect x="75" y="100" width="45" height="25" fill="none" stroke="#76ff03" strokeWidth="1.5" />

      {/* Draw Cut Lines */}
      {isX && (
        <g stroke="#ff0000" strokeWidth="1" strokeDasharray="4 2" opacity="0.7">
          <line x1="20" y1="60" x2="180" y2="60" />
          <line x1="20" y1="95" x2="125" y2="95" />
        </g>
      )}
      
      {isY && (
        <g stroke="#ff0000" strokeWidth="1" strokeDasharray="4 2" opacity="0.7">
          <line x1="67" y1="20" x2="67" y2="60" />
          <line x1="122" y1="20" x2="122" y2="130" />
          <line x1="87" y1="60" x2="87" y2="95" />
          <line x1="72" y1="95" x2="72" y2="130" />
        </g>
      )}
      
      {/* Optimization label */}
      <text x="100" y="145" fill="#aaa" fontSize="8" textAnchor="middle">
        {optimizeFor === 'Cuts' ? 'Optimized for Guillotine Cuts' : 'Optimized for Yield'}
      </text>
    </svg>
  );
};
