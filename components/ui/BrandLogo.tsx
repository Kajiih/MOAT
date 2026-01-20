/**
 * @file BrandLogo.tsx
 * @description Renders the application logo ("MOAT") with dynamic coloring.
 * Colors are derived from the top tiers of the current board state.
 * Supports multiple variants (header, footer, default) for different contexts.
 * @module BrandLogo
 */

import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BrandLogoProps {
  /** Exactly 5 colors (hex values, can be undefined if missing) */
  colors: (string | undefined)[];
  className?: string;
  variant?: 'default' | 'header' | 'footer';
}

/**
 * Renders the application brand logo with support for dynamic coloring and multiple size variants.
 * @param props - The props for the component.
 * @param props.colors - Exactly 5 colors (hex values, can be undefined if missing)
 * @param props.className - Additional CSS classes.
 * @param props.variant - The size variant of the logo.
 * @returns The rendered BrandLogo component.
 */
export function BrandLogo({ colors, className, variant = 'default' }: BrandLogoProps) {
  const letters = ['M', 'O', 'A', 'T'];

  const baseStyles = 'flex select-none font-black';

  const variantStyles = {
    default: 'text-sm tracking-[0.3em] gap-[2px]',
    header: 'text-4xl italic tracking-tighter sm:text-5xl md:text-6xl gap-1',
    footer: 'text-sm tracking-widest',
  };

  return (
    <span className={twMerge(baseStyles, variantStyles[variant], className)}>
      {letters.map((letter, i) => (
        <span
          key={i}
          style={{ color: colors[i] }}
          className={twMerge(
            'transition-all duration-500',
            !colors[i] && 'pointer-events-none opacity-0',
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
