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

/**
 * Props for the ExportBoard component.
 */
interface ExportBoardProps {
    state: TierListState;
    brandColors: string[];
    resolvedImages?: Record<string, string>; // Map of original URL -> Data URL
}

/**
 * Simplified Media Card for export.
 * Uses hardcoded Data URLs passed from the hook to avoid duplication/network bugs.
 */
function ExportMediaCard({ item, resolvedUrl }: { item: MediaItem, resolvedUrl?: string }) {
    const { Icon: TypeIcon, getSubtitle, getTertiaryText } = getMediaUI(item.type);
    const line2 = getSubtitle(item);
    const line3 = getTertiaryText(item);

    return (
        <div className="relative w-28 h-28 bg-neutral-800 rounded-md overflow-hidden shadow-sm flex-shrink-0 z-0">
            {resolvedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                    src={resolvedUrl} 
                    alt={item.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                    decoding="sync"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-600 p-2 overflow-hidden">
                    <TypeIcon size={24} className="mb-1 opacity-50" />
                    <span className="text-[9px] text-center leading-tight uppercase font-black opacity-30 mt-1 line-clamp-2 px-1">
                        {item.title}
                    </span>
                    <span className="text-[7px] text-center leading-tight uppercase font-bold opacity-20 mt-1">{item.type}</span>
                </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/100 via-black/90 to-transparent px-1.5 pb-1 pt-8 z-10">
                <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight mb-0.5">{item.title}</p>
                {line2 && (
                    <p className={`text-[9px] line-clamp-2 leading-tight ${line3 ? 'text-neutral-200 mb-0.5' : 'text-neutral-400'}`}>
                        {line2}
                    </p>
                )}
                {line3 && (
                    <p className="text-[9px] text-neutral-400 line-clamp-2 leading-tight">
                        {line3}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Simplified Tier Row for export.
 */
function ExportTierRow({ tier, items, resolvedImages }: { tier: TierDefinition; items: MediaItem[]; resolvedImages: Record<string, string> }) {
    const tierTheme = getColorTheme(tier.color);

    return (
        <div className="flex bg-neutral-900 border border-neutral-800 min-h-[7rem] mb-2 rounded-lg overflow-hidden">
            {/* Label Column */}
            <div className={`w-24 md:w-32 flex items-center justify-center p-2 shrink-0 ${tierTheme.bg}`}>
                <span className="text-neutral-900 font-black text-2xl md:text-3xl tracking-tighter text-center uppercase break-words px-2 leading-none">
                    {tier.label}
                </span>
            </div>

            {/* Items Column */}
            <div className="flex-1 p-3 flex flex-wrap items-center gap-2">
                {items.map(item => (
                    <ExportMediaCard 
                        key={item.id} 
                        item={item} 
                        resolvedUrl={item.imageUrl ? resolvedImages[item.imageUrl] : undefined} 
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * The main ExportBoard component.
 */
export function ExportBoard({ state, brandColors, resolvedImages = {} }: ExportBoardProps) {
    return (
        <div 
            id="export-board-surface"
            className="p-10 bg-[#0a0a0a] flex flex-col" 
            style={{ 
                width: '1200px', 
                minHeight: '1200px',
                color: '#e5e5e5'
            }} 
        >
            {/* Header / Title Section */}
            <div className="flex flex-col items-center mb-12">
                <h1 className="text-neutral-200 text-7xl font-black tracking-tighter italic text-center uppercase leading-none mb-2">
                    {state.title || 'Untitled Tier List'}
                </h1>
                <div className="w-24 h-1.5 bg-neutral-800 rounded-full" />
            </div>

            {/* Tiers Container */}
            <div className="flex-1 space-y-2">
                {state.tierDefs.map(tier => (
                    <ExportTierRow 
                        key={tier.id} 
                        tier={tier} 
                        items={state.items[tier.id] || []} 
                        resolvedImages={resolvedImages}
                    />
                ))}
            </div>

            {/* Footer / Branding */}
            <div className="mt-16 pt-8 border-t border-neutral-900 flex justify-between items-center opacity-70">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-1.5">
                         {brandColors.map((color, i) => (
                             <div 
                                key={i} 
                                className="w-5 h-5 rounded-full border-2 border-[#0a0a0a]" 
                                style={{ backgroundColor: color }} 
                             />
                         ))}
                    </div>
                    <div>
                        <p className="text-neutral-300 text-sm font-black tracking-widest uppercase italic">Moat Tier List</p>
                        <p className="text-neutral-600 text-[10px] font-bold uppercase tracking-tighter">Your curation system</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-neutral-500 text-xs font-medium uppercase tracking-widest">
                        Snapshot: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-neutral-700 text-[9px] font-bold uppercase tracking-widest mt-1">
                        MBID-STABLE-RELEASE
                    </p>
                </div>
            </div>
        </div>
    );
}
