/**
 * @file ExportBoard.tsx
 * @description A dedicated, non-interactive component for high-reliability image generation.
 * This component is designed to be rendered into an offscreen DOM node for screenshot capture.
 * It uses standard <img> tags and simplified layouts to avoid issues with DOM cloning.
 */

import React from 'react';

import { BrandLogo } from '@/components/ui/BrandLogo';
import { Footer } from '@/components/ui/Footer';
import { useBrandColors } from '@/lib/hooks/useBrandColors';
import { TierListState } from '@/lib/types';

import { BoardTitle } from './BoardTitle';
import { TierList } from './TierList';

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
      className="relative flex flex-col items-center justify-center bg-neutral-950 px-8 py-4 font-sans text-neutral-200 antialiased"
      style={{
        width: '1200px',
        minHeight: '800px',
      }}
    >
      {/* Top-Left Branding */}
      <div className="absolute top-6 left-8">
        <BrandLogo colors={logoHexColors} variant="header" />
      </div>

      {/* Main Content Wrapper - Explicit framing */}
      <div className="flex w-full flex-col items-center">
        {/* 1. Centered Title */}
        <div className="mt-2 mb-8 flex w-full justify-center">
          <BoardTitle title={state.title} isExport={true} />
        </div>

        {/* 2. Tier List - Full Width within Gutter */}
        <TierList
          tiers={state.tierDefs}
          items={state.items}
          isExport={true}
          resolvedImages={resolvedImages}
          onRemoveItem={() => {}}
          onUpdateTier={() => {}}
          onDeleteTier={() => {}}
          onInfo={() => {}}
        />

        {/* 3. Branding Footer - Symmetrical and Centered */}
        <Footer colors={logoHexColors} className="pt-2 pb-0" />
      </div>
    </div>
  );
}
