import {
  AsyncMultiSelectFilterDefinition,
  AsyncSelectFilterDefinition,
  BooleanFilterDefinition,
  DateFilterDefinition,
  MultiSelectFilterDefinition,
  NumberFilterDefinition,
  RangeFilterDefinition,
  SelectFilterDefinition,
  TextFilterDefinition,
} from './types';

export function createTextFilter<TTransformed = any>(
  config: Omit<TextFilterDefinition<TTransformed>, 'type'>
): TextFilterDefinition<TTransformed> {
  return { ...config, type: 'text' };
}

export function createNumberFilter<TTransformed = any>(
  config: Omit<NumberFilterDefinition<TTransformed>, 'type'>
): NumberFilterDefinition<TTransformed> {
  return { ...config, type: 'number' };
}

export function createBooleanFilter<TTransformed = any>(
  config: Omit<BooleanFilterDefinition<TTransformed>, 'type'>
): BooleanFilterDefinition<TTransformed> {
  return { ...config, type: 'boolean' };
}

export function createSelectFilter<TTransformed = any>(
  config: Omit<SelectFilterDefinition<TTransformed>, 'type'>
): SelectFilterDefinition<TTransformed> {
  return { ...config, type: 'select' };
}

export function createMultiSelectFilter<TTransformed = any>(
  config: Omit<MultiSelectFilterDefinition<TTransformed>, 'type'>
): MultiSelectFilterDefinition<TTransformed> {
  return { ...config, type: 'multiselect' };
}

export function createAsyncSelectFilter<TTransformed = any>(
  config: Omit<AsyncSelectFilterDefinition<TTransformed>, 'type'>
): AsyncSelectFilterDefinition<TTransformed> {
  return { ...config, type: 'async-select' };
}

export function createAsyncMultiSelectFilter<TTransformed = any>(
  config: Omit<AsyncMultiSelectFilterDefinition<TTransformed>, 'type'>
): AsyncMultiSelectFilterDefinition<TTransformed> {
  return { ...config, type: 'async-multiselect' };
}

export function createRangeFilter<TTransformed = any>(
  config: Omit<RangeFilterDefinition<TTransformed>, 'type'>
): RangeFilterDefinition<TTransformed> {
  return { ...config, type: 'range' };
}

export function createDateFilter<TTransformed = any>(
  config: Omit<DateFilterDefinition<TTransformed>, 'type'>
): DateFilterDefinition<TTransformed> {
  return { ...config, type: 'date' };
}
