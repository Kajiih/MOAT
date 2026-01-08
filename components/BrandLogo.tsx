import React from 'react';

interface BrandLogoProps {
  colors: string[];
  className?: string; // Wrapper class needed for layout (flex, gap, etc)
}

export function BrandLogo({ colors, className }: BrandLogoProps) {
  return (
    <span className={className}>
      <span style={{ color: colors[0] }}>M</span>
      <span style={{ color: colors[1] }}>O</span>
      <span style={{ color: colors[2] }}>A</span>
      <span style={{ color: colors[3] }}>T</span>
    </span>
  );
}
