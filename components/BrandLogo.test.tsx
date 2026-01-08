import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  const mockColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

  it('should render the letters MOAT', () => {
    render(<BrandLogo colors={mockColors} />);
    expect(screen.getByText('M')).toBeDefined();
    expect(screen.getByText('O')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('T')).toBeDefined();
  });

  it('should apply variant classes correctly (header)', () => {
    const { container } = render(<BrandLogo colors={mockColors} variant="header" />);
    const logoContainer = container.querySelector('span');
    expect(logoContainer?.className).toContain('text-4xl');
    expect(logoContainer?.className).toContain('italic');
  });

  it('should apply variant classes correctly (footer)', () => {
    const { container } = render(<BrandLogo colors={mockColors} variant="footer" />);
    const logoContainer = container.querySelector('span');
    expect(logoContainer?.className).toContain('text-sm');
    expect(logoContainer?.className).not.toContain('italic');
  });

  it('should apply colors to the letters', () => {
    render(<BrandLogo colors={mockColors} />);
    const m = screen.getByText('M');
    const o = screen.getByText('O');
    
    // Testing specific styles applied via style prop
    expect(m.style.color).toBe('rgb(255, 0, 0)'); // #ff0000
    expect(o.style.color).toBe('rgb(0, 255, 0)'); // #00ff00
  });
});
