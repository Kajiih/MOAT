/**
 * @file ExportBoard.tsx
 * @description A dedicated, non-interactive component for high-reliability image generation.
 * This component is designed to be rendered into an offscreen DOM node for screenshot capture.
 * It uses standard <img> tags and simplified layouts to avoid issues with DOM cloning.
 */

import React from 'react';
import { MediaItem, TierListState, TierDefinition } from '@/lib/types';
import { getColorTheme } from '@/lib/colors';
import { getMediaUI } from '@/lib/media-defs';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { TierRow } from './TierRow';
import { useBrandColors } from '@/lib/hooks/useBrandColors';

/**
 * Props for the ExportBoard component.
 */
interface ExportBoardProps {
    state: TierListState;
    brandColors: string[];
    resolvedImages?: Record<string, string>;
}

/**
 * The main ExportBoard component.
 * Reuses the exact same components and styles as the main application but in a 
 * non-interactive "Export Mode" to ensure 100% visual parity.
 */
export function ExportBoard({ state, brandColors, resolvedImages = {} }: ExportBoardProps) {
    const logoHexColors = useBrandColors(brandColors);

    return (
        <div 
            id="export-board-surface"
            className="bg-neutral-950 text-neutral-200 font-sans antialiased flex flex-col items-center justify-center py-4 px-8" 
            style={{ 
                width: '1200px', 
                minHeight: '800px',
            }} 
        >
            {/* Main Content Wrapper - Explicit framing */}
            <div className="w-full flex flex-col items-center">
                
                {/* 1. Centered Title */}
                <div className="w-full flex justify-center mt-4 mb-8">
                    <h1 className="text-neutral-200 text-4xl font-black tracking-tighter italic text-center w-full max-w-[85%] leading-[1.1]">
                        {state.title || 'Untitled Tier List'}
                    </h1>
                </div>

                {/* 2. Tier List - Full Width within Gutter */}
                <div className="w-full space-y-4">
                    {state.tierDefs.map((tier) => (
                        <TierRow 
                            key={tier.id} 
                            tier={tier}
                            items={state.items[tier.id] || []} 
                            onRemoveItem={() => {}} 
                            onUpdateTier={() => {}}
                            onDeleteTier={() => {}}
                            canDelete={false}
                            isAnyDragging={false}
                            onInfo={() => {}}
                            isExport={true}
                            resolvedImages={resolvedImages}
                        />
                    ))}
                </div>

                {/* 3. Branding Footer - Symmetrical and Centered */}
                <div className="pt-2 pb-0 text-center pointer-events-none select-none">
                    <div className="flex items-center justify-center gap-3 opacity-90">
                        <BrandLogo 
                            colors={logoHexColors} 
                            variant="footer"
                        />
                        <span className="text-[10px] text-neutral-700 uppercase tracking-widest font-semibold border-l border-neutral-800 pl-3">
                            Tier List Maker
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
