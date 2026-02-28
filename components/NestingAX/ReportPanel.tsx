import React, { useMemo } from 'react';
import { Part, Sheet, CadEntity } from './services/db'; // Task 22
import { reportService, NestingStats } from './services/reportService';
import { dxfService } from './services/dxfService'; // Task 22

interface ReportPanelProps {
  onClose: () => void;
  parts: Part[];
  sheets: Sheet[];
  cadEntities?: CadEntity[]; // Added to allow PDF export of geometry
}

const StatRow: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = "text-gray-300" }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
    <span className="text-gray-400 text-sm font-medium">{label}</span>
    <span className={`${color} text-sm font-bold font-mono tracking-tight`}>{value}</span>
  </div>
);

const ReportPanel: React.FC<ReportPanelProps> = ({ onClose, parts, sheets, cadEntities = [] }) => {
  const stats: NestingStats = useMemo(() => reportService.calculateStats(parts, sheets), [parts, sheets]);

  const handleDownloadReport = () => {
    const text = reportService.generateReportText(stats);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nesting_Report_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    try {
      // Get dimensions from first sheet if available
      const sheet = sheets[0];
      let sw = 1000, sh = 1000;
      if (sheet) {
        const dims = sheet.dimensions.split('x').map(Number);
        if (dims.length === 2) { sw = dims[0]; sh = dims[1]; }
      }
      
      const pdfBlob = dxfService.exportToPdf(cadEntities, sw, sh);
      dxfService.downloadBlob(pdfBlob, `Nesting_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2d2d2d] w-[500px] border border-slate-600 shadow-2xl rounded-lg overflow-hidden flex flex-col scale-in-center">
        {/* Header */}
        <div className="px-4 py-3 bg-[#1e1e1e] border-b border-slate-600 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="material-icons-outlined text-yellow-400">analytics</span>
            <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">Nesting Productivity Report</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] bg-gradient-to-b from-[#2d2d2d] to-[#252525]">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg flex flex-col items-center justify-center border ${stats.utilization > 80 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-xs text-gray-400 uppercase font-bold mb-1">Efficiency</span>
              <span className={`text-3xl font-black ${stats.utilization > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                {stats.utilization.toFixed(1)}%
              </span>
            </div>
            <div className="p-4 rounded-lg flex flex-col items-center justify-center bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs text-gray-400 uppercase font-bold mb-1">Total Sheets</span>
              <span className="text-3xl font-black text-blue-400">{stats.totalSheets}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-2 px-1">Inventory Summary</h4>
            <StatRow label="Total Parts" value={stats.totalParts} />
            <StatRow label="Nested Parts" value={stats.nestedParts} color="text-green-400" />
            <StatRow label="Unnested Parts" value={stats.unnestedParts} color={stats.unnestedParts > 0 ? "text-red-400" : "text-gray-400"} />
            
            <h4 className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.2em] mt-6 mb-2 px-1">Material Breakdown</h4>
            <StatRow label="Total Sheet Area" value={`${(stats.totalSheetArea / 1000000).toFixed(3)} m²`} />
            <StatRow label="Total Part Area" value={`${(stats.totalPartArea / 1000000).toFixed(3)} m²`} />
            <StatRow label="Waste Area (Scrap)" value={`${(stats.scrapArea / 1000000).toFixed(3)} m²`} color="text-yellow-500" />
            
            <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mt-6 mb-2 px-1">Cutting Estimates</h4>
            <StatRow label="Total Cutting Length" value={`${(stats.totalCuttingLength / 1000).toFixed(2)} meters`} color="text-purple-300" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#1e1e1e] border-t border-slate-600 flex justify-end space-x-2">
          <button 
             onClick={handleDownloadReport}
             className="px-4 py-1.5 flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs font-bold rounded shadow transition duration-200 border border-slate-500/30"
          >
            <span className="material-icons-outlined text-sm">download</span>
            <span>TXT/CSV</span>
          </button>
          <button 
             onClick={handleExportPDF}
             className="px-4 py-1.5 flex items-center space-x-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded shadow transition duration-200 border border-red-900/40"
          >
            <span className="material-icons-outlined text-sm">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
          <button 
             onClick={onClose}
             className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg transition duration-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPanel;
