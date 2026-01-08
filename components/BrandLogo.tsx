import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BrandLogoProps {
  /** Exactly 4 colors (hex values, can be undefined if missing) */
  colors: (string | undefined)[];
  className?: string;
  variant?: 'default' | 'header' | 'footer';
}

export function BrandLogo({ colors, className, variant = 'default' }: BrandLogoProps) {
  const letters = ['M', 'O', 'A', 'T'];

  const baseStyles = "flex select-none font-black";
  
  const variantStyles = {
    default: "text-sm tracking-[0.3em] gap-[2px]",
    header: "text-4xl italic tracking-tighter sm:text-5xl md:text-6xl gap-1",
    footer: "text-sm tracking-widest"
  };

  return (
    <span className={twMerge(baseStyles, variantStyles[variant], className)}>
      {letters.map((letter, i) => (
        <span 
          key={i} 
          style={{ color: colors[i] }} 
          className={twMerge(
            "transition-all duration-500",
            !colors[i] && "opacity-0 pointer-events-none"
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
