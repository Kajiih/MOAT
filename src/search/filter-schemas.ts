import { z } from 'zod';

/**
 * The types of UI inputs supported for filters.
 */
export const FilterInputTypeSchema = z.enum([
  'text', 
  'number', 
  'boolean', 
  'select', 
  'multiselect', 
  'async-select',
  'async-multiselect',
  'range', 
  'date'
]);

export type FilterInputType = z.infer<typeof FilterInputTypeSchema>;

/**
 * Represents a single option for select/multiselect filters.
 */
export const FilterOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  // LucideIcon cannot be easily validated with Zod as it's a component
  icon: z.any().optional(), 
});

export type FilterOption = z.infer<typeof FilterOptionSchema>;

/**
 * Definition for a filter that the UI should render.
 */
export interface BaseFilterDefinition<TValue = any, TTransformed = any> {
  /** Unique ID for the filter (used as key in internal state) */
  id: string;
  /** Human readable label for the UI */
  label: string;
  /** Default value for the filter state */
  defaultValue?: TValue;
  /** Optional helper text shown to the user */
  helperText?: string;

  /** 
   * Declarative Mapping
   * The API parameter name this filter maps to.
   */
  mapTo?: string;
  /** 
   * A transformation function to convert the UI value to an API parameter.
   * This is the "Escape Hatch" for database-specific logic.
   */
  transform?: (value: TValue) => TTransformed;
  /**
   * Defines test cases to verify this filter correctly narrows results.
   */
  testCases: { 
    /** Optional query to use with this filter test case */
    query?: string;
    /** The value to apply to the filter in the UI/search state */
    value: TValue; 
    /** 
     * Optional per-item verification function.
     * Receives the raw item returned by the database (Provider specific).
     * Must return true if the item honors the filter value.
     */
    match?: (item: any) => boolean;
    /**
     * Optional verification function for the entire result set.
     * Use this for aggregate assertions like "verify ID X is not in results".
     * Receives the full array of raw items.
     * 
     * @important Every test case is expected to return at least one result.
     */
    verifyResults?: (items: any[]) => void;
  }[];
}

export interface TextFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string, TTransformed> {
  type: 'text';
  /** Placeholder text for the input */
  placeholder?: string;
}

export interface NumberFilterDefinition<TTransformed = any> extends BaseFilterDefinition<number, TTransformed> {
  type: 'number';
  /** Placeholder text for the input */
  placeholder?: string;
}

export interface BooleanFilterDefinition<TTransformed = any> extends BaseFilterDefinition<boolean, TTransformed> {
  type: 'boolean';
}

export interface SelectFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string, TTransformed> {
  type: 'select';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

export interface MultiSelectFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string[], TTransformed> {
  type: 'multiselect';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

export interface AsyncSelectFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string, TTransformed> {
  type: 'async-select';
  /** 
   * Specifies the ID of the entity within the SAME database provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

export interface AsyncMultiSelectFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string[], TTransformed> {
  type: 'async-multiselect';
  /** 
   * Specifies the ID of the entity within the SAME database provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

export interface RangeFilterDefinition<TTransformed = any> extends BaseFilterDefinition<{ min?: string; max?: string }, TTransformed> {
  type: 'range';
  /** Optional placeholder for the minimum input field */
  minPlaceholder?: string;
  /** Optional placeholder for the maximum input field */
  maxPlaceholder?: string;
}

export interface DateFilterDefinition<TTransformed = any> extends BaseFilterDefinition<string, TTransformed> {
  type: 'date';
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Discriminated union of all filter definitions.
 * By removing `TValue = any` here, consumers are forced to match the intrinsic
 * payload type (`string`, `string[]`, or `{min, max}`) based purely on the `type` tag.
 */
export type FilterDefinition<TTransformed = any> = 
  | TextFilterDefinition<TTransformed>
  | NumberFilterDefinition<TTransformed>
  | BooleanFilterDefinition<TTransformed>
  | SelectFilterDefinition<TTransformed>
  | MultiSelectFilterDefinition<TTransformed>
  | AsyncSelectFilterDefinition<TTransformed>
  | AsyncMultiSelectFilterDefinition<TTransformed>
  | RangeFilterDefinition<TTransformed>
  | DateFilterDefinition<TTransformed>;

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
