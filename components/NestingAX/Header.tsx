import React from 'react';

interface HeaderProps {
  onHomeClick?: () => void;
  onImportDXF?: () => void;
  onNewNestList?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick, onImportDXF, onNewNestList }) => {
  return (
    <header className="h-[48px] w-full bg-[#1e2329] flex items-center justify-between px-3 border-b border-[#0d1014] select-none z-[100] relative">
      {/* Left section: Logo and Title */}
      <div className="flex items-center h-full">
        <button
          onClick={onHomeClick}
          className="w-[32px] h-[32px] flex items-center justify-center bg-[#D21844] hover:bg-[#b01438] rounded-sm transition-colors mr-3"
          title="Autodesk"
        >
          <svg viewBox="3 3 25.15 25.15" className="w-[18px] h-[18px] fill-white">
            <path d="M12 4L3 21h4.5l2.1-4h8l2.1 4H24L15 4h-3zm-1.8 10L13.5 7h.2l3.3 7h-6.8z" />
          </svg>
        </button>

        <div className="bg-[#2a3c5a] text-[#8ab4f8] text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded-[4px] uppercase mr-4">
          Education
        </div>

        <div className="flex items-center text-[13px]">
          <span className="text-[#9aa0a6]">AutoCAD Web</span>
          <span className="text-[#5f6368] mx-2">/</span>
          <span className="text-white font-medium">Drawing 1.dwg</span>
        </div>
      </div>

      {/* Right section: Toolbar actions */}
      <div className="flex items-center h-full gap-3 text-[#9aa0a6]">
        {/* Save Dropdown */}
        <div className="flex items-center border border-[#5f6368] rounded-sm overflow-hidden h-[28px] mr-2">
          <button className="px-3 hover:bg-[#2c3138] text-[#e8eaed] text-[13px] h-full flex items-center transition-colors">
            Save
          </button>
          <div className="w-[1px] h-full bg-[#5f6368]"></div>
          <button className="px-1.5 hover:bg-[#2c3138] h-full flex items-center justify-center transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>

        <button className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#2c3138] rounded-full transition-colors" title="Print">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
          </svg>
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#2c3138] rounded-full transition-colors" title="Settings">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#2c3138] rounded-full transition-colors" title="Help">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
            <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M13,19h-2v-2h2V19z M15.07,11.25l-0.9,0.92 C13.45,12.9,13,13.5,13,15h-2v-0.5c0-1.1,0.45-2.1,1.17-2.83l1.24-1.26c0.37-0.36,0.59-0.86,0.59-1.41c0-1.1-0.9-2-2-2s-2,0.9-2,2 H8c0-2.21,1.79-4,4-4s4,1.79,4,4C16,9.88,15.65,10.68,15.07,11.25z" />
          </svg>
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#2c3138] rounded-full transition-colors relative" title="Notifications">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>
        </button>

        <button className="w-[30px] h-[30px] ml-2 mr-1 rounded-full bg-[#183a54] hover:bg-[#204e70] border border-[#2b5e85] flex items-center justify-center transition-colors">
          <span className="text-[#64b5f6] text-[11px] font-bold">TH</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
