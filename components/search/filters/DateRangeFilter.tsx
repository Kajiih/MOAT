/**
 * @file DateRangeFilter.tsx
 * @description A reusable filter component for selecting a year range (Min/Max).
 * Used across multiple entity types (Artist birth year, Album release year).
 * @module DateRangeFilter
 */

import { FilterRow, FilterCol, FILTER_INPUT_STYLES } from './FilterPrimitives';

interface DateRangeFilterProps {
  minYear: string;
  maxYear: string;
  onMinYearChange: (value: string) => void;
  onMaxYearChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
  compact?: boolean;
}

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
