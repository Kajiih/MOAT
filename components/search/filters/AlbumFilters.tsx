/**
 * @file AlbumFilters.tsx
 * @description specialized filter component for Album entities.
 * Allows filtering by Primary Type (Album, EP, Single) and Secondary Type (Live, Compilation).
 * Supports both a full view (SearchTab) and a compact view (ContextPickers).
 * @module AlbumFilters
 */

import { PRIMARY_TYPES, SECONDARY_TYPES } from '@/lib/types';
import { FilterButton } from '@/components/ui/FilterButton';
import { Info } from 'lucide-react';

/**
 * Props for the AlbumFilters component.
 */
interface AlbumFiltersProps {
  /** Array of active primary type filters (e.g., 'Album', 'EP'). */
  primaryTypes: string[];
  /** Array of active secondary type filters (e.g., 'Live', 'Compilation'). */
  secondaryTypes: string[];
  /** Callback fired when a primary type is toggled. */
  onTogglePrimary: (type: string) => void;
  /** Callback fired when a secondary type is toggled. */
  onToggleSecondary: (type: string) => void;
  /** Callback to reset primary type filters to defaults. */
  onResetPrimary?: () => void;
  /** Callback to clear all secondary type filters. */
  onResetSecondary?: () => void;
  /** Callback to select all secondary type filters. */
  onSelectAllSecondary?: () => void;
  /** Whether to render in a compact layout (for pickers). */
  compact?: boolean;
}

/**
 * Renders UI controls for filtering album search results by their metadata types.
 */
export function AlbumFilters({
  primaryTypes,
  secondaryTypes,
  onTogglePrimary,
  onToggleSecondary,
  onResetPrimary,
  onResetSecondary,
  onSelectAllSecondary,
  compact = false,
}: AlbumFiltersProps) {
  if (compact) {
    // Simplified view for Pickers
    return (
      <div className="flex flex-col gap-2 text-[10px]">
        {/* Primary Types Section */}
        <div>
          <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
            Primary Type
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIMARY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onTogglePrimary(t)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${primaryTypes.includes(t) ? 'bg-blue-900/40 border-blue-800 text-blue-200' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Types Section */}
        <div>
          <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
            Secondary Type
          </div>
          <div className="flex flex-wrap gap-1">
            {SECONDARY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onToggleSecondary(t)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${secondaryTypes.includes(t) ? 'bg-purple-900/40 border-purple-800 text-purple-200' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full view for SearchTab
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between">
          <span>Primary Type</span>
          {onResetPrimary &&
            !(
              primaryTypes.length === 2 &&
              primaryTypes.includes('Album') &&
              primaryTypes.includes('EP')
            ) && (
              <button onClick={onResetPrimary} className="text-red-400 hover:text-red-300">
                Reset
              </button>
            )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRIMARY_TYPES.map((t) => (
            <FilterButton
              key={t}
              label={t}
              isSelected={primaryTypes.includes(t)}
              onClick={() => onTogglePrimary(t)}
              variant="primary"
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span>Secondary Type</span>
            <div className="group relative">
              <Info
                size={12}
                className="text-neutral-500 cursor-help hover:text-neutral-300 transition-colors"
              />
              <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-neutral-900 border border-neutral-700 rounded shadow-xl text-[10px] text-neutral-300 normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                By default, standard albums are shown. Select types to exclusively filter for them
                (e.g. &apos;Live&apos; shows only Live albums).
              </div>
            </div>
          </div>
          {onResetSecondary && (
            <button
              onClick={() => {
                if (secondaryTypes.length === SECONDARY_TYPES.length) {
                  onResetSecondary?.();
                } else {
                  onSelectAllSecondary?.();
                }
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {secondaryTypes.length === SECONDARY_TYPES.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SECONDARY_TYPES.map((t) => (
            <FilterButton
              key={t}
              label={t}
              isSelected={secondaryTypes.includes(t)}
              onClick={() => onToggleSecondary(t)}
              variant="secondary"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
