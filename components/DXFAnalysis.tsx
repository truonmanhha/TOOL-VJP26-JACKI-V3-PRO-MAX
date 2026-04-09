import React, { useState } from 'react';
import { BarChart3, FileText, Zap, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { DXFAnalysisResult } from '../services/dxfAnalysisService';
import DXFAnalysisService from '../services/dxfAnalysisService';
import { Language, TRANSLATIONS } from '../constants';

interface DXFAnalysisProps {
  lang: Language;
  file: File | null;
}

const DXFAnalysis: React.FC<DXFAnalysisProps> = ({ lang, file }) => {
  const t = TRANSLATIONS[lang];
  const [analysis, setAnalysis] = useState<DXFAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!file) return;

    const analyzeFile = async () => {
      setIsAnalyzing(true);
      setError(null);
      try {
        const result = await DXFAnalysisService.analyzeDxfFile(file);
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze file');
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeFile();
  }, [file]);

  if (!file) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mt-8"
    >
      <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-purple-400 uppercase tracking-tight">
              DXF Analysis
            </h3>
            <p className="text-sm text-slate-400 mt-1">{file.name}</p>
          </div>
        </div>

        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="inline-block">
              <div className="animate-spin">
                <Zap className="text-purple-400 w-8 h-8" />
              </div>
            </div>
            <p className="text-slate-400 mt-4">Analyzing file...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-6 border border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Total Entities
                </p>
                <p className="text-3xl font-black text-white">
                  {analysis.totalEntities}
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-6 border border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Total Area
                </p>
                <p className="text-3xl font-black text-purple-400">
                  {(analysis.totalArea / 1000000).toFixed(4)} m²
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-6 border border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Entity Types
                </p>
                <p className="text-3xl font-black text-blue-400">
                  {Object.keys(analysis.entityTypes).length}
                </p>
              </div>
            </div>

            {/* Entity Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider">
                Entity Types
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {Object.entries(analysis.entityTypes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between bg-slate-900/30 p-4 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-purple-400 w-5 h-5" />
                        <span className="font-bold text-white">{type}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-right">
                          <span className="text-2xl font-black text-purple-400">
                            {count}
                          </span>
                        </span>
                        <div className="w-32 bg-slate-900 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-blue-600 h-full"
                            style={{
                              width: `${
                                (count / analysis.totalEntities) * 100
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Area by Type */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-300 uppercase tracking-wider">
                Area by Type
              </h4>
              <div className="space-y-2">
                {Object.entries(analysis.areaByType)
                  .filter(([, area]) => area > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, area]) => (
                    <div
                      key={`area-${type}`}
                      className="flex items-center justify-between bg-slate-900/30 p-4 rounded-lg border border-white/5"
                    >
                      <span className="font-bold text-white">{type}</span>
                      <span className="text-purple-400 font-bold">
                        {(area / 1000000).toFixed(4)} m²
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
              <p>
                💡 For accurate area calculations with ARC entities, use the
                Python script to convert ARCs to LWPOLYLINES first.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DXFAnalysis;
