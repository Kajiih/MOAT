/**
 * @file ExportBoard.tsx
 * @description A dedicated, non-interactive component for high-reliability image generation.
 * This component is designed to be rendered into an offscreen DOM node for screenshot capture.
 * It uses standard <img> tags and simplified layouts to avoid issues with DOM cloning.
 */

import React from 'react';

import { BrandLogo } from '@/app/_components/BrandLogo';
import { Footer } from '@/app/_components/Footer';
import { useBrandColors } from '@/board/hooks/useBrandColors';
import { TierListState } from '@/board/types';

import { BoardTitle } from './BoardTitle';
import { TierList } from './TierList';

/**
 * Props for the ExportBoard component.
 */
interface ExportBoardProps {
  state: TierListState;
  brandColors: string[];
}

/**
 * The main ExportBoard component.
 * Reuses the exact same components and styles as the main application but in a
 * non-interactive "Export Mode" to ensure 100% visual parity.
 * @param props - The props for the component.
 * @param props.state - The current tier list state.
 * @param props.brandColors - Array of hex color strings for branding.
 * @returns The rendered ExportBoard component.
 */
export function ExportBoard({ state, brandColors }: ExportBoardProps) {
  const logoHexColors = useBrandColors(brandColors);

  return (
    <div
      id="export-board-surface"
      className="relative flex flex-col items-center justify-center bg-surface px-8 py-4 font-sans text-neutral-200 antialiased"
      style={{
        width: '1200px',
        minHeight: '800px',
      }}
    >
      {/* Main Content Wrapper - Explicit framing */}
      <div className="flex w-full flex-col items-center">
        {/* Header Section with Side Logo aligned to title */}
        <div className="relative mb-12 flex w-full flex-col items-center justify-center">
          {/* Top-Left Branding */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2">
            <BrandLogo colors={logoHexColors} variant="header" />
          </div>

          {/* 1. Centered Title */}
          <div className="flex w-full justify-center">
            <BoardTitle title={state.title} isExport={true} />
          </div>

          {/* Separator */}
          <div
            className="mt-6 h-1 w-24 rounded-full opacity-80"
            style={{ backgroundColor: logoHexColors[0] || '#3b82f6' }}
          />
        </div>

        {/* 2. Tier List - Full Width within Gutter */}
        <TierList
          tiers={state.tierDefs}
          items={Object.fromEntries(
            Object.entries(state.tierLayout).map(([tierId, ids]) => [
              tierId,
              ids.map((id) => state.itemEntities[id]!).filter(Boolean)
            ])
          )}
          isExport={true}
          onRemoveItem={() => {}}
          onUpdateTier={() => {}}
          onDeleteTier={() => {}}
        />

        {/* 3. Branding Footer - Symmetrical and Centered */}
        <Footer colors={logoHexColors} className="pt-2 pb-0" />
      </div>
    </div>
  );
}
