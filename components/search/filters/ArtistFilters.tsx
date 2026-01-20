/**
 * @file ArtistFilters.tsx
 * @description Specialized filter component for Artist entities.
 * Allows filtering by Artist Type (Person, Group) and Country.
 * @module ArtistFilters
 */

import { ARTIST_TYPES } from '@/lib/types';

import { FILTER_INPUT_STYLES, FilterCol, FilterRow } from './FilterPrimitives';

/**
 * Props for the ArtistFilters component.
 */
interface ArtistFiltersProps {
  /** The currently selected artist type (e.g., 'Person', 'Group'). */
  type: string;
  /** The current country filter (2-letter code). */
  country: string;
  /** Callback fired when the artist type selection changes. */
  onTypeChange: (val: string) => void;
  /** Callback fired when the country filter text changes. */
  onCountryChange: (val: string) => void;
  /** Optional CSS class for the container. */
  className?: string;
  /** Whether to render in a compact layout (for pickers). */
  compact?: boolean;
}

/**
 * Renders UI controls for filtering artist search results by their type and origin country.
 * @param props - The props for the component.
 * @param props.type - The currently selected artist type (e.g., 'Person', 'Group').
 * @param props.country - The current country filter (2-letter code).
 * @param props.onTypeChange - Callback fired when the artist type selection changes.
 * @param props.onCountryChange - Callback fired when the country filter text changes.
 * @param props.className - Optional CSS class for the container.
 * @param props.compact - Whether to render in a compact layout (for pickers).
 */
export function ArtistFilters({
  type,
  country,
  onTypeChange,
  onCountryChange,
  className = '',
  compact = false,
}: ArtistFiltersProps) {
  return (
    <FilterRow compact={compact} className={className}>
      <FilterCol>
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className={FILTER_INPUT_STYLES}
        >
          <option value="">Type</option>
          {ARTIST_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FilterCol>
      <FilterCol>
        <input
          placeholder={compact ? 'Country' : 'Country (e.g. US, GB, JP)'}
          className={FILTER_INPUT_STYLES}
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
        />
      </FilterCol>
    </FilterRow>
  );
}
