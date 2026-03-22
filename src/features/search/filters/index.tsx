/**
 * @file Filter UI Engine
 * @description Centralized React routing mechanism dynamically yielding precise inputs from logical filters.
 */

import React from 'react';

import { FilterDefinition } from '@/features/search/filter-schemas';

import { AsyncSelectFilterInput } from './AsyncSelectFilterInput';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.FC<FilterControlProps<any>>
> = {
  text: TextFilterInput,
  select: SelectFilterInput,
  boolean: BooleanFilterInput,
  multiselect: MultiSelectFilterInput,
  range: RangeFilterInput,
  number: TextFilterInput, // Fallback to text for number
  date: TextFilterInput, // Fallback to text for date
  'async-select': AsyncSelectFilterInput,
  'async-multiselect': MultiSelectFilterInput,
};

/**
 * Fallback component for unimplemented filter types.
 * @param props - The filter control properties.
 * @param props.filter - The definition of the filter being rendered.
 * @returns An indicative placeholder node.
 */
export const FallbackFilterInput: React.FC<FilterControlProps> = ({ filter }) => (
  <div className="text-caption text-neutral-600 italic">
    UI for {filter.type} not implemented yet
  </div>
);
