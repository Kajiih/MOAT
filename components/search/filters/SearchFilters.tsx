/**
 * @file SearchFilters.tsx
 * @description A composite component that renders the appropriate filter inputs based on the selected Media Type.
 * Aggregates specific sub-filters (ArtistFilters, AlbumFilters) and common filters (DateRange, Tags) into a unified UI.
 * @module SearchFilters
 */

import { SearchParamsState } from '@/lib/hooks/useMediaSearch';
import { MediaType, SECONDARY_TYPES } from '@/lib/types';

import { AlbumFilters } from './AlbumFilters';
import { ArtistFilters } from './ArtistFilters';
import { DateRangeFilter } from './DateRangeFilter';
import { FILTER_INPUT_STYLES } from './FilterPrimitives';

/**
 * Props for the SearchFilters component.
 */
interface SearchFiltersProps {
  /** The current search mode (artist, album, or song). */
  type: MediaType;
  /** The current state of all search filters. */
  filters: SearchParamsState;
  /** Callback to update one or more filter values. */
  updateFilters: (patch: Partial<SearchParamsState>) => void;
  /** Whether to render in a compact layout (for pickers). */
  compact?: boolean;
  /** Optional React nodes to render at the top (e.g., entity pickers). */
  contextPickers?: React.ReactNode;
}

/**
 * Renders the full suite of search filters tailored to the active media type.
 * Combines entity-specific logic with shared filters like date range and tags.
 * @param props - The props for the component.
 * @param props.type - The current search mode (artist, album, or song).
 * @param props.filters - The current state of all search filters.
 * @param props.updateFilters - Callback to update one or more filter values.
 * @param props.compact - Whether to render in a compact layout (for pickers).
 * @param props.contextPickers - Optional React nodes to render at the top (e.g., entity pickers).
 */
export function SearchFilters({
  type,
  filters,
  updateFilters,
  compact = false,
  contextPickers,
}: SearchFiltersProps) {
  // Helper wrappers for Album filters
  const togglePrimaryType = (t: string) => {
    const current = filters.albumPrimaryTypes;
    const newTypes = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    updateFilters({ albumPrimaryTypes: newTypes });
  };

  const toggleSecondaryType = (t: string) => {
    const current = filters.albumSecondaryTypes;
    const newTypes = current.includes(t) ? current.filter((x) => x !== t) : [...current, t];
    updateFilters({ albumSecondaryTypes: newTypes });
  };

  return (
    <div className={`space-y-2 ${compact ? 'text-[10px]' : ''}`}>
      {contextPickers && (
        <div className="mb-2 space-y-2 border-b border-neutral-800 pb-2">{contextPickers}</div>
      )}

      {/* Type-Specific Filters */}
      {type === 'artist' && (
        <ArtistFilters
          type={filters.artistType}
          country={filters.artistCountry}
          onTypeChange={(val) => updateFilters({ artistType: val })}
          onCountryChange={(val) => updateFilters({ artistCountry: val })}
          className={compact ? 'text-[10px]' : ''}
          compact={compact}
        />
      )}

      {type === 'album' && (
        <AlbumFilters
          primaryTypes={filters.albumPrimaryTypes}
          secondaryTypes={filters.albumSecondaryTypes}
          onTogglePrimary={togglePrimaryType}
          onToggleSecondary={toggleSecondaryType}
          onResetPrimary={() => updateFilters({ albumPrimaryTypes: ['Album', 'EP'] })}
          onResetSecondary={() => updateFilters({ albumSecondaryTypes: [] })}
          onSelectAllSecondary={() => updateFilters({ albumSecondaryTypes: [...SECONDARY_TYPES] })}
          compact={compact}
        />
      )}

      {/* Common Date Filter */}
      <div>
        <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
          {type === 'artist' ? 'Born / Formed' : 'Release Year'}
        </div>
        <DateRangeFilter
          minYear={filters.minYear}
          maxYear={filters.maxYear}
          onMinYearChange={(val) => updateFilters({ minYear: val })}
          onMaxYearChange={(val) => updateFilters({ maxYear: val })}
          fromLabel="From Year"
          toLabel="To Year"
          compact={compact}
        />
      </div>

      {/* Common Tag Filter */}
      <div>
        <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
          Tag / Genre
        </div>
        <input
          placeholder={compact ? 'Tag / Genre' : 'e.g. rock, jazz, 80s...'}
          className={FILTER_INPUT_STYLES}
          value={filters.tag}
          onChange={(e) => updateFilters({ tag: e.target.value })}
        />
      </div>

      {/* Song Specific */}
      {type === 'song' && (
        <div>
          <div className="mb-1 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
            Duration (Seconds)
          </div>
          <div className={`flex gap-2 ${compact ? '' : 'grid grid-cols-2'}`}>
            <input
              placeholder="Min Sec"
              type="number"
              className={FILTER_INPUT_STYLES}
              value={filters.minDuration}
              onChange={(e) => updateFilters({ minDuration: e.target.value })}
            />
            <input
              placeholder="Max Sec"
              type="number"
              className={FILTER_INPUT_STYLES}
              value={filters.maxDuration}
              onChange={(e) => updateFilters({ maxDuration: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
