import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NestingPart, NestingSheet, MultiSheetResult } from '../../types';

// Define core state types
interface NestingState {
    // Data
    parts: NestingPart[];
    sheets: NestingSheet[];
    results: MultiSheetResult | null;

    // View
    zoom: number;
    pan: { x: number, y: number };

    // UI
    activeTab: 'parts' | 'sheets' | 'results';
    showSettings: boolean;

    // Methods
    setParts: (parts: NestingPart[] | ((prev: NestingPart[]) => NestingPart[])) => void;
    setSheets: (sheets: NestingSheet[] | ((prev: NestingSheet[]) => NestingSheet[])) => void;
    setResults: (results: MultiSheetResult | null) => void;
    setZoom: (zoom: number | ((prev: number) => number)) => void;
    setPan: (pan: { x: number, y: number }) => void;
    setActiveTab: (tab: 'parts' | 'sheets' | 'results') => void;
}

const NestingContext = createContext<NestingState | undefined>(undefined);

export const NestingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [parts, setParts] = useState<NestingPart[]>([]);
    const [sheets, setSheets] = useState<NestingSheet[]>([]);
    const [results, setResults] = useState<MultiSheetResult | null>(null);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const [activeTab, setActiveTab] = useState<'parts' | 'sheets' | 'results'>('parts');
    const [showSettings, setShowSettings] = useState(false);

    return (
        <NestingContext.Provider value={{
            parts, sheets, results,
            zoom, pan,
            activeTab, showSettings,
            setParts, setSheets, setResults,
            setZoom, setPan,
            setActiveTab
        }}>
            {children}
        </NestingContext.Provider>
    );
};

export const useNesting = () => {
    const context = useContext(NestingContext);
    if (!context) throw new Error('useNesting must be used within NestingProvider');
    return context;
};
