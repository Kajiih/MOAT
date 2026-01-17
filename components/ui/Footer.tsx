/**
 * @file Footer.tsx
 * @description Shared footer component displaying the MOAT branding.
 * Used in both the live application and the export board for consistency.
 * @module Footer
 */

'use client';

import { BrandLogo } from './BrandLogo';

interface FooterProps {
  /** Hex color values for the brand logo */
  colors: (string | undefined)[];
  /** Additional CSS classes for positioning/styling */
  className?: string;
}

/**
 * Footer component displaying the MOAT logo and "Tier List Maker" text.
 * Reusable across the application and export views.
 */
export function Footer({ colors, className = '' }: FooterProps) {
  return (
    <div className={`text-center pointer-events-none select-none ${className}`}>
      <div className="flex items-center justify-center gap-3 opacity-90">
        <BrandLogo 
          colors={colors} 
          variant="footer"
        />
        <span className="text-[10px] text-neutral-700 uppercase tracking-widest font-semibold border-l border-neutral-800 pl-3">
          Tier List Maker
        </span>
      </div>
    </div>
  );
}
