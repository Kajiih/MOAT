import React from 'react';

import { FilterDefinition } from '@/lib/database/filters';

import {
  BooleanFilterInput,
  MultiSelectFilterInput,
  RangeFilterInput,
  SelectFilterInput,
  TextFilterInput,
} from './FilterInputs';
import { FilterControlProps } from './types';

/**
 * Registry mapping filter types to their respective React components.
 * To add a new filter type globally, add its component here.
 */
export const FilterUIComponents: Record<
  FilterDefinition['type'],
  React.FC<FilterControlProps<any>>
> = {
  text: TextFilterInput,
  select: SelectFilterInput,
  boolean: BooleanFilterInput,
  multiselect: MultiSelectFilterInput,
  range: RangeFilterInput,
  number: TextFilterInput, // Fallback to text for number
  date: TextFilterInput, // Fallback to text for date
  'async-select': SelectFilterInput, // Fallback to select for async select
  'async-multiselect': MultiSelectFilterInput,
};

/**
 * Fallback component for unimplemented filter types.
 */
export const FallbackFilterInput: React.FC<FilterControlProps> = ({ filter }) => (
  <div className="text-[10px] text-neutral-600 italic">
    UI for {filter.type} not implemented yet
  </div>
);
