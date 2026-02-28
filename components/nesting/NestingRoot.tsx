import React from 'react';
import { NestingProvider } from './NestingContext';
import { NestingLayout } from './NestingLayout';

export const NestingRoot: React.FC = () => {
    return (
        <div className="w-full h-[800px] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <NestingProvider>
                <NestingLayout />
            </NestingProvider>
        </div>
    );
};
