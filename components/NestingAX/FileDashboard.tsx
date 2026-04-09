import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NestList } from './services/db';

const ACCEPTED_EXTENSIONS = ['.dwg', '.dxf', '.dwt', '.pdf', '.jpg', '.png', '.zip', '.svg'];

interface FileDashboardProps {
  nestLists: NestList[];
  onOpenProject: (id: string) => void;
  onNewDrawing: () => void;
  onUpload: () => void;
  onFilesDropped?: (files: File[]) => void;
  onDeleteProject?: (id: string) => void;
}

const FileDashboard: React.FC<FileDashboardProps> = ({ nestLists, onOpenProject, onNewDrawing, onUpload, onFilesDropped, onDeleteProject }) => {
  const [activeTab, setActiveTab] = useState('recent');
  const [openingFile, setOpeningFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map user data to mock AutoCAD table data
  const displayFiles = nestLists.map(l => ({
    id: l.id,
    name: l.name,
    date: new Date(l.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    size: '35 KB', // Mock size as per DB
    owner: '-',
    shared: '-'
  }));

  const handleFileClick = (fileId: string) => {
    setOpeningFile(fileId);
    // Simulate loading
    setTimeout(() => {
      onOpenProject(fileId);
      setOpeningFile(null);
    }, 1000);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex w-full h-full bg-[#2A3038] text-[#DCE4ED] font-['ArtifaktElement',sans-serif] select-none">

      {/* 1. SIDEBAR */}
      <div className="w-[240px] bg-[#222831] flex flex-col justify-between border-r border-[#191D23] shadow-md z-10">
        <div className="flex flex-col px-4 py-5">
          {/* Logo Title */}
          <div className="text-[18px] font-semibold text-white mb-6">AutoCAD</div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-[1px] mb-8">
            <div className="flex">
              <button
                onClick={onNewDrawing}
                className="flex-1 bg-transparent hover:bg-[#343C47] border border-[#3E4652] border-r-0 text-[13px] text-white font-medium py-[6px] px-3 transition-colors rounded-l-sm text-left"
              >
                New Drawing
              </button>
              <button className="bg-transparent hover:bg-[#343C47] border border-[#3E4652] text-white px-2 rounded-r-sm transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
              </button>
            </div>

            <div className="flex mt-[10px]">
              <button
                onClick={handleUploadClick}
                className="flex-1 bg-transparent hover:bg-[#343C47] border border-[#3E4652] border-r-0 text-[13px] text-white font-medium py-[6px] px-3 transition-colors rounded-l-sm text-left"
              >
                Upload...
              </button>
              <button className="bg-transparent hover:bg-[#343C47] border border-[#3E4652] text-white px-2 rounded-r-sm transition-colors flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
              </button>
            </div>

            <button className="w-full mt-[10px] bg-transparent hover:bg-[#343C47] border border-[#3E4652] text-[13px] text-white font-medium py-[6px] px-3 transition-colors rounded-sm text-left">
              New Folder
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col">
            <button
              onClick={() => setActiveTab('recent')}
              className={`text-left px-3 py-1.5 text-[13px] rounded-sm transition-colors ${activeTab === 'recent' ? 'bg-[#343C47] text-white font-medium' : 'text-[#A0B0C0] hover:text-white hover:bg-[#343C47]'}`}
            >
              Recent
            </button>

            <div className="mt-4 mb-1 px-3 text-[12px] font-bold text-white">AutoCAD Web</div>

            <button className="text-left px-3 py-1.5 text-[13px] text-[#0696D7] hover:underline transition-colors">
              Add Autodesk Projects...
            </button>
            <button className="text-left px-3 py-1.5 text-[13px] text-[#0696D7] hover:underline transition-colors">
              Add Storage Source...
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar - Feedback */}
        <div className="p-4 border-t border-[#191D23]">
          <button className="flex items-center gap-2 text-[#0696D7] text-[13px] hover:underline">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" /></svg>
            Provide Feedback
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col bg-[#2D333B]">
        {/* Top Header Section */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-end">
          <h1 className="text-[17px] font-semibold text-white">AutoCAD Web</h1>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8894A4]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder="Search current folder..."
              className="bg-transparent border-b border-[#525A66] text-[13px] text-white pl-9 pr-4 py-1 focus:outline-none focus:border-[#0696D7] transition-colors w-[220px] placeholder-[#8894A4]"
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-8 py-3 flex gap-6 items-center text-[13px] font-medium text-[#DCE4ED]">
          <button className="flex items-center gap-2 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Refresh
          </button>
          <button className="flex items-center gap-2 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            Manage Support Files
          </button>
        </div>

        {/* File Table Area */}
        <div className="flex-1 overflow-auto px-8 mt-2 pb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#3E4652] text-[12px] text-[#A0B0C0] font-semibold bg-[#2A3038]">
                <th className="px-4 py-2 font-medium w-[120px]">File Type</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-[200px]">Date Modified</th>
                <th className="px-4 py-2 font-medium w-[100px]">Size</th>
                <th className="px-4 py-2 font-medium w-[120px]">Owner</th>
                <th className="px-4 py-2 font-medium w-[120px]">Shared</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">

              {/* Static Sample Folder */}
              <tr className="border-b border-[#353C45] hover:bg-[#343C47] transition-colors cursor-pointer group">
                <td className="px-4 py-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#8894A4">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                </td>
                <td className="px-4 py-3 font-medium text-[#EAEFF5]">Samples</td>
                <td className="px-4 py-3 text-[#A0B0C0]">-</td>
                <td className="px-4 py-3 text-[#A0B0C0]">-</td>
                <td className="px-4 py-3 text-[#A0B0C0]"></td>
                <td className="px-4 py-3 text-[#A0B0C0]"></td>
              </tr>

              {/* Dynamic Files */}
              {displayFiles.map(file => (
                <tr
                  key={file.id}
                  onClick={() => handleFileClick(file.id)}
                  className="border-b border-[#353C45] hover:bg-[#343C47] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4 2v20h16V8l-6-6H4z" fill="#24518B" />
                      <path d="M14 2v6h6" fill="#1C3F6B" />
                      <path d="M6 14h12M6 18h12M6 10h5" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.5" />
                      <rect x="7" y="11" width="10" height="8" fill="#F0B52B" />
                      <line x1="12" y1="12" x2="12" y2="18" stroke="white" strokeWidth="1" />
                      <line x1="8" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1" />
                      <circle cx="12" cy="15" r="1.5" fill="none" stroke="white" strokeWidth="1" />
                    </svg>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#EAEFF5]">{file.name}</td>
                  <td className="px-4 py-3 text-[#A0B0C0]">{file.date}</td>
                  <td className="px-4 py-3 text-[#A0B0C0]">{file.size}</td>
                  <td className="px-4 py-3 text-[#A0B0C0]">{file.owner}</td>
                  <td className="px-4 py-3 text-[#A0B0C0]">{file.shared}</td>
                </tr>
              ))}

              {/* Static Empty State Example if no files */}
              {displayFiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#A0B0C0]">
                    No files found in this folder.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".dwg,.dxf,.dwt,.pdf,.jpg,.png,.zip,.svg"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesDropped?.(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Loading Overlay */}
      {openingFile && (
        <div className="absolute inset-0 bg-[#2D333B]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0696D7" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <div className="text-white font-medium">Opening Drawing...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDashboard;
