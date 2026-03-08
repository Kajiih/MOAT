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
  icon: z.unknown().optional(), 
});

export type FilterOption = z.infer<typeof FilterOptionSchema>;

/**
 * A single test case for verifying a filter's behavior in integration tests.
 * Each test case specifies a filter value and optionally a query and verification logic.
 */
export interface FilterTestCase<TValue = unknown, TRaw = unknown> {
  /** Optional query to use with this filter test case */
  query?: string;
  /** The value to apply to the filter in the UI/search state */
  value: TValue; 
  /** 
   * Optional per-item verification function.
   * Receives the raw item returned by the database (Provider specific).
   * Must return true if the item honors the filter value.
   */
  match?: (item: TRaw) => boolean;
  /**
   * Optional verification function for the entire result set.
   * Use this for aggregate assertions like "verify ID X is not in results".
   * Receives the full array of raw items.
   * 
   * @important Every test case is expected to return at least one result.
   */
  verifyResults?: (items: TRaw[]) => void;
}

/**
 * Definition for a filter that the UI should render.
 */
export interface BaseFilterDefinition<TValue = unknown, TTransformed = unknown, TRaw = unknown> {
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
  testCases: FilterTestCase<TValue, TRaw>[];
}

export interface TextFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string, TTransformed, TRaw> {
  type: 'text';
  /** Placeholder text for the input */
  placeholder?: string;
}

export interface NumberFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<number, TTransformed, TRaw> {
  type: 'number';
  /** Placeholder text for the input */
  placeholder?: string;
}

export interface BooleanFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<boolean, TTransformed, TRaw> {
  type: 'boolean';
}

export interface SelectFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string, TTransformed, TRaw> {
  type: 'select';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

export interface MultiSelectFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string[], TTransformed, TRaw> {
  type: 'multiselect';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

export interface AsyncSelectFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string, TTransformed, TRaw> {
  type: 'async-select';
  /** 
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

export interface AsyncMultiSelectFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string[], TTransformed, TRaw> {
  type: 'async-multiselect';
  /** 
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

export interface RangeFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<{ min?: string; max?: string }, TTransformed, TRaw> {
  type: 'range';
  /** Optional placeholder for the minimum input field */
  minPlaceholder?: string;
  /** Optional placeholder for the maximum input field */
  maxPlaceholder?: string;
}

export interface DateFilterDefinition<TTransformed = unknown, TRaw = unknown> extends BaseFilterDefinition<string, TTransformed, TRaw> {
  type: 'date';
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Discriminated union of all filter definitions.
 * By removing `TValue = any` here, consumers are forced to match the intrinsic
 * payload type (`string`, `string[]`, or `{min, max}`) based purely on the `type` tag.
 */
export type FilterDefinition<TTransformed = unknown, TRaw = unknown> = 
  | TextFilterDefinition<TTransformed, TRaw>
  | NumberFilterDefinition<TTransformed, TRaw>
  | BooleanFilterDefinition<TTransformed, TRaw>
  | SelectFilterDefinition<TTransformed, TRaw>
  | MultiSelectFilterDefinition<TTransformed, TRaw>
  | AsyncSelectFilterDefinition<TTransformed, TRaw>
  | AsyncMultiSelectFilterDefinition<TTransformed, TRaw>
  | RangeFilterDefinition<TTransformed, TRaw>
  | DateFilterDefinition<TTransformed, TRaw>;

/**
 * An array of filter definitions that abstracts away the specific transformation types,
 * used when collecting heterogenous filters (e.g. text, range, boolean) into a single API options list.
 */

export type AnyFilterDefinition<TRaw = unknown> = FilterDefinition<unknown, TRaw>;

/**
 * Creates a suite of filter building functions that are statically bound
 * to the generic type `TRaw` of the expected Provider responses.
 * 
 * This prevents repetitive `<any, RAWGGame>` boilerplate on every individual filter definition.
 */
export function createFilterSuite<TRaw>() {
  return {
    text: <TTransformed = unknown>(
      config: Omit<TextFilterDefinition<TTransformed, TRaw>, 'type'>
    ): TextFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'text' };
    },

    number: <TTransformed = unknown>(
      config: Omit<NumberFilterDefinition<TTransformed, TRaw>, 'type'>
    ): NumberFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'number' };
    },

    boolean: <TTransformed = unknown>(
      config: Omit<BooleanFilterDefinition<TTransformed, TRaw>, 'type'>
    ): BooleanFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'boolean' };
    },

    select: <TTransformed = unknown>(
      config: Omit<SelectFilterDefinition<TTransformed, TRaw>, 'type'>
    ): SelectFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'select' };
    },

    multiselect: <TTransformed = unknown>(
      config: Omit<MultiSelectFilterDefinition<TTransformed, TRaw>, 'type'>
    ): MultiSelectFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'multiselect' };
    },

    asyncSelect: <TTransformed = unknown>(
      config: Omit<AsyncSelectFilterDefinition<TTransformed, TRaw>, 'type'>
    ): AsyncSelectFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'async-select' };
    },

    asyncMultiselect: <TTransformed = unknown>(
      config: Omit<AsyncMultiSelectFilterDefinition<TTransformed, TRaw>, 'type'>
    ): AsyncMultiSelectFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'async-multiselect' };
    },

    range: <TTransformed = unknown>(
      config: Omit<RangeFilterDefinition<TTransformed, TRaw>, 'type'>
    ): RangeFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'range' };
    },

    date: <TTransformed = unknown>(
      config: Omit<DateFilterDefinition<TTransformed, TRaw>, 'type'>
    ): DateFilterDefinition<TTransformed, TRaw> => {
      return { ...config, type: 'date' };
    }
  };
}


