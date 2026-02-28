/**
 * @file GameView.tsx
 * @description Detail view for video game items in the DetailsModal.
 * Displays Metacritic score, platforms, developer/publisher, and description.
 * @module GameView
 */

import { MediaDetails } from '@/lib/types';

interface GameViewProps {
  details: MediaDetails;
}

/**
 * Returns the color class for a Metacritic score badge.
 * @param score - Metacritic score (0-100).
 * @returns Tailwind CSS class string for border, background, and text colors.
 */
function getMetacriticColorClass(score: number): string {
  if (score >= 75) return 'border-green-500 bg-green-500/20 text-green-400';
  if (score >= 50) return 'border-yellow-500 bg-yellow-500/20 text-yellow-400';
  return 'border-red-500 bg-red-500/20 text-red-400';
}

/**
 * Renders game-specific metadata in the DetailsModal.
 * @param props - Component props.
 * @param props.details - The media details object containing game metadata.
 * @returns The rendered game detail view.
 */
export function GameView({ details }: GameViewProps) {
  return (
    <div className="space-y-6">
      {/* Metacritic + Quick Info */}
      <div className="flex flex-wrap items-start gap-4">
        {details.metacritic != null && (
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-xl font-bold ${getMetacriticColorClass(details.metacritic)}`}
            >
              {details.metacritic}
            </div>
            <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase">
              Metacritic
            </span>
          </div>
        )}

        <div className="flex-1 space-y-2">
          {details.developer && (
            <div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Developer
              </span>
              <p className="text-sm text-neutral-300">{details.developer}</p>
            </div>
          )}
          {details.publisher && (
            <div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Publisher
              </span>
              <p className="text-sm text-neutral-300">{details.publisher}</p>
            </div>
          )}
          {details.date && (
            <div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Release Date
              </span>
              <p className="text-sm text-neutral-300">{details.date}</p>
            </div>
          )}
        </div>
      </div>

      {/* Platforms */}
      {details.platforms && details.platforms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase">
            Platforms
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(details.platforms)).map((platform: string) => (
              <span
                key={platform}
                className="rounded-full border border-neutral-700 bg-neutral-800/50 px-3 py-1 text-xs text-neutral-300"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
