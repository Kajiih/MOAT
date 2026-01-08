import React from 'react';
import { twMerge } from 'tailwind-merge';

interface BrandLogoProps {
  colors: string[];
  className?: string;
  variant?: 'default' | 'header' | 'footer';
}

export function BrandLogo({ colors, className, variant = 'default' }: BrandLogoProps) {
  
  const baseStyles = "flex select-none";
  
  const variantStyles = {
    default: "",
    header: "text-4xl font-black tracking-tighter uppercase italic gap-1",
    footer: "text-sm font-black tracking-[0.3em] gap-[2px]"
  };

  return (
    <span className={twMerge(baseStyles, variantStyles[variant], className)}>
      <span style={{ color: colors[0] }} className="transition-colors duration-500">M</span>
      <span style={{ color: colors[1] }} className="transition-colors duration-500">O</span>
      <span style={{ color: colors[2] }} className="transition-colors duration-500">A</span>
      <span style={{ color: colors[3] }} className="transition-colors duration-500">T</span>
    </span>
  );
}
