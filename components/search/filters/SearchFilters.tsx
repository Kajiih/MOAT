/**
 * @file SearchFilters.tsx
 * @description A composite component that renders the appropriate filter inputs based on the selected Media Type.
 * Aggregates specific sub-filters (ArtistFilters, AlbumFilters) and common filters (DateRange, Tags) into a unified UI.
 * @module SearchFilters
 */

import { MediaType, SECONDARY_TYPES } from '@/lib/types';
import { SearchParamsState } from '@/lib/hooks/useMediaSearch';
import { ArtistFilters } from './ArtistFilters';
import { AlbumFilters } from './AlbumFilters';
import { DateRangeFilter } from './DateRangeFilter';
import { FILTER_INPUT_STYLES } from './FilterPrimitives';

interface SearchFiltersProps {
  type: MediaType;
  filters: SearchParamsState;
  updateFilters: (patch: Partial<SearchParamsState>) => void;
  compact?: boolean;
  contextPickers?: React.ReactNode;
}

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
        <div className="space-y-2 mb-2 pb-2 border-b border-neutral-800">{contextPickers}</div>
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
        <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
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
        <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
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
          <div className="text-neutral-600 font-bold uppercase tracking-wider text-[9px] mb-1">
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
