import { TierDefinition, MediaItem } from '@/lib/types';

interface OGBoardProps {
  title: string;
  tiers: TierDefinition[];
  items: Record<string, MediaItem[]>;
  headerColors: string[];
}

/**
 * A simplified, Satori-compatible board component for Open Graph image generation.
 * 
 * Rules for Satori/Edge:
 * 1. No CSS classes (mostly), use inline `style={{ ... }}`.
 * 2. Flexbox ONLY. No Grid.
 * 3. explicit display: 'flex'.
 * 4. No state, hooks, or interactivity.
 */
export function OGBoard({ title, tiers, items, headerColors }: OGBoardProps) {
  // Use the primary brand color or fallback
  const primaryColor = headerColors[0] || '#3b82f6';
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        color: '#e5e5e5',
        fontFamily: 'sans-serif',
        padding: '40px',
        alignItems: 'center',
      }}
    >
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', width: '100%' }}>
        {/* Logo Mark */}
        <div style={{
            display: 'flex',
            width: '48px', 
            height: '48px', 
            borderRadius: '12px',
            backgroundColor: primaryColor,
            marginRight: '20px',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: '24px'
        }}>
            M
        </div>
        
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>{title}</span>
            <span style={{ fontSize: '16px', color: '#a3a3a3' }}>moat.app</span>
        </div>
      </div>

      {/* Board Content (Simplified) */}
      <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%', 
          flex: 1,
          gap: '16px',
      }}>
        {tiers.map((tier) => {
            const tierItems = items[tier.id] || [];
            if (tierItems.length === 0) return null;

            const tierColor = getTierColor(tier.color);

            return (
                <div key={tier.id} style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'stretch' }}>
                    {/* Tier Label */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100px',
                        backgroundColor: tierColor,
                        borderRadius: '8px 0 0 8px',
                        padding: '10px',
                        flexShrink: 0,
                    }}>
                        <span style={{ 
                            fontSize: '18px', 
                            fontWeight: 700, 
                            color: '#000', 
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>
                            {tier.label}
                        </span>
                    </div>

                    {/* Tier Items */}
                    <div style={{
                        display: 'flex',
                        flex: 1,
                        backgroundColor: '#171717',
                        borderRadius: '0 8px 8px 0',
                        padding: '8px',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        {tierItems.slice(0, 10).map((item) => (
                            <div key={item.id} style={{
                                display: 'flex',
                                width: '60px',
                                height: '60px',
                                position: 'relative',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                backgroundColor: '#262626'
                            }}>
                                {item.imageUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img 
                                        src={item.imageUrl} 
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '10px', color: '#525252' }}>?</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}

function getTierColor(colorId: string): string {
    const colors: Record<string, string> = {
        red: '#f87171',
        orange: '#fb923c',
        amber: '#fbbf24',
        yellow: '#facc15',
        lime: '#a3e635',
        green: '#4ade80',
        emerald: '#34d399',
        teal: '#2dd4bf',
        cyan: '#22d3ee',
        sky: '#38bdf8',
        blue: '#60a5fa',
        indigo: '#818cf8',
        violet: '#a78bfa',
        purple: '#c084fc',
        fuchsia: '#e879f9',
        pink: '#f472b6',
        rose: '#fb7185',
        slate: '#94a3b8',
    };
    return colors[colorId] || '#94a3b8';
}