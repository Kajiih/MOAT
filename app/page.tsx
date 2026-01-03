'use client';

import dynamic from 'next/dynamic';
import { getColorTheme } from '@/lib/colors';

// Loading Skeleton / Initial state look
const LoadingState = () => {
    const letters = ['M', 'O', 'A', 'T'];
    const colors = ['red', 'orange', 'amber', 'green']; // Preview colors
    
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans flex flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic animate-pulse select-none flex">
              {letters.map((letter, i) => {
                  const theme = getColorTheme(colors[i]);
                  return <span key={i} className={theme.text}>{letter}</span>;
              })}
          </h1>
          <div className="text-neutral-500 text-sm">Loading application...</div>
        </div>
    );
};

const TierListApp = dynamic(() => import('@/components/TierListApp'), {
  ssr: false,
  loading: () => <LoadingState />
});

export default function Page() {
  return <TierListApp />;
}