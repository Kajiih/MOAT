/**
 * @file DateRangeFilter.tsx
 * @description A reusable filter component for selecting a year range (Min/Max).
 * Used across multiple entity types (Artist birth year, Album release year).
 * @module DateRangeFilter
 */

import { FILTER_INPUT_STYLES,FilterCol, FilterRow } from './FilterPrimitives';

/**
 * Props for the DateRangeFilter component.
 */
interface DateRangeFilterProps {
  /** The minimum year value. */
  minYear: string;
  /** The maximum year value. */
  maxYear: string;
  /** Callback fired when the min year changes. */
  onMinYearChange: (value: string) => void;
  /** Callback fired when the max year changes. */
  onMaxYearChange: (value: string) => void;
  /** Custom label for the 'from' field. */
  fromLabel?: string;
  /** Custom label for the 'to' field. */
  toLabel?: string;
  /** Optional CSS class for the container. */
  className?: string;
  /** Whether to render in a compact layout. */
  compact?: boolean;
}

/**
 * Renders a pair of numeric inputs for filtering results by a year range.
 */
export function DateRangeFilter({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
  fromLabel = 'From Year',
  toLabel = 'To Year',
  className = '',
  compact = false,
}: DateRangeFilterProps) {
  return (
    <FilterRow compact={compact} className={className}>
      <FilterCol>
        <input
          placeholder={fromLabel}
          type="number"
          className={FILTER_INPUT_STYLES}
          value={minYear}
          onChange={(e) => onMinYearChange(e.target.value)}
        />
      </FilterCol>
      <FilterCol>
        <input
          placeholder={toLabel}
          type="number"
          className={FILTER_INPUT_STYLES}
          value={maxYear}
          onChange={(e) => onMaxYearChange(e.target.value)}
        />
      </FilterCol>
    </FilterRow>
  );
}
