/**
 * @file AlbumFilters.tsx
 * @description specialized filter component for Album entities.
 * Allows filtering by Primary Type (Album, EP, Single) and Secondary Type (Live, Compilation).
 * Supports both a full view (SearchTab) and a compact view (ContextPickers).
 * @module AlbumFilters
 */

import { Info } from 'lucide-react';

import { FilterButton } from '@/components/ui/FilterButton';
import { PRIMARY_TYPES, SECONDARY_TYPES } from '@/lib/types';

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
 * @param props - The props for the component.
 * @param props.primaryTypes
 * @param props.secondaryTypes
 * @param props.onTogglePrimary
 * @param props.onToggleSecondary
 * @param props.onResetPrimary
 * @param props.onResetSecondary
 * @param props.onSelectAllSecondary
 * @param props.compact
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
          <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
            Primary Type
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIMARY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onTogglePrimary(t)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${primaryTypes.includes(t) ? 'border-blue-800 bg-blue-900/40 text-blue-200' : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Types Section */}
        <div>
          <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
            Secondary Type
          </div>
          <div className="flex flex-wrap gap-1">
            {SECONDARY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onToggleSecondary(t)}
                className={`rounded border px-1.5 py-0.5 transition-colors ${secondaryTypes.includes(t) ? 'border-purple-800 bg-purple-900/40 text-purple-200' : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-300'}`}
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
        <div className="mb-1.5 flex justify-between text-[10px] font-bold text-neutral-500 uppercase">
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
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase">
          <div className="flex items-center gap-1.5">
            <span>Secondary Type</span>
            <div className="group relative">
              <Info
                size={12}
                className="cursor-help text-neutral-500 transition-colors hover:text-neutral-300"
              />
              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-56 rounded border border-neutral-700 bg-neutral-900 p-2 text-[10px] font-normal text-neutral-300 normal-case opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
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
              className="text-blue-400 transition-colors hover:text-blue-300"
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
