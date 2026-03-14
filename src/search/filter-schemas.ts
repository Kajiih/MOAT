/**
 * @file Filter Schemas
 * @description Core Zod schemas and utilities validating Filter configurations across adapters.
 */

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
  'date',
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
 * Valid value types for evaluating applied UI filters.
 */
export type FilterValues = Record<
  string,
  string | number | boolean | string[] | { min?: string; max?: string } | undefined
>;

// --- Runtime Validation Schemas for Filter Values ---

export const TextValueSchema = z.string();

export const NumberValueSchema = z.coerce.number().refine((val) => !Number.isNaN(val), {
  message: 'Parsed number cannot be NaN',
});

export const BooleanValueSchema = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (val === 'false' || val === '0' || val === 0) return false;
  if (val === 'true' || val === '1' || val === 1) return true;
  return Boolean(val);
}, z.boolean());

export const ArrayValueSchema = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (val) return [val];
  return [];
}, z.array(z.string()));

export const RangeValueSchema = z.object({
  min: z.string().optional(),
  max: z.string().optional(),
});

// ---------------------------------------------------

/**
 * Base properties for a single test case verifying a filter's behavior.
 */
export interface BaseFilterTestCase<TValue = unknown, TRaw = unknown> {
  /** Optional query string to search for alongside this filter value */
  query?: string;
  /** The value to apply to the filter in the UI/search state */
  value: TValue;
  
  /**
   * Evaluates to true if ALL items in the result set passes this condition.
   * Useful for strict filters where no outliers are acceptable (e.g. status: 'official').
   */
  expectAll?: (item: TRaw) => boolean;

  /**
   * Evaluates to true if AT LEAST ONE item in the result set passes this condition.
   * Useful for arrays or broad matches (e.g. ensuring an artist credit is present somewhere).
   */
  expectSome?: (item: TRaw) => boolean;

  /**
   * Evaluates to true if NO items in the result set pass this condition.
   * Useful for negative assertions (e.g. precise search should exclude a specific typo result).
   */
  expectNone?: (item: TRaw) => boolean;

  /**
   * Custom hook to inspect the entire raw array payload collectively.
   * Should only be used for complex assertions that cannot be expressed with expectAll, expectSome, or expectNone.
   */
  expectAggregate?: (items: TRaw[]) => void;

  /** Description of the expected property for expectAll. Fits into: "Expected all results to [msg], but [item] doesn't." */
  expectAllMessage?: string;
  /** Description of the expected property for expectSome. Fits into: "Expected at least one result to [msg], but none did." */
  expectSomeMessage?: string;
  /** Description of the expected property for expectNone. Fits into: "Expected no results to [msg], but [item] did." */
  expectNoneMessage?: string;
}

/**
 * A test case for verifying a filter's behavior in integration tests.
 * Enforces at the TypeScript level that at least one verification predicate
 * (expectEvery, expectSome, or expectAggregate) is defined.
 */
export type FilterTestCase<TValue = unknown, TRaw = unknown> = 
  BaseFilterTestCase<TValue, TRaw> &
  (
    | { expectAll: Exclude<BaseFilterTestCase<TValue, TRaw>['expectAll'], undefined> }
    | { expectSome: Exclude<BaseFilterTestCase<TValue, TRaw>['expectSome'], undefined> }
    | { expectNone: Exclude<BaseFilterTestCase<TValue, TRaw>['expectNone'], undefined> }
    | { expectAggregate: Exclude<BaseFilterTestCase<TValue, TRaw>['expectAggregate'], undefined> }
  );

/**
 * Definition for a filter that the UI should render.
 */
export interface BaseFilterDefinition<TValue = unknown, TRaw = unknown> {
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
  transform?: (value: TValue) => unknown;
  /**
   * Defines test cases to verify this filter correctly narrows results.
   */
  testCases: FilterTestCase<TValue, TRaw>[];
}

/** Defines a text-based filter mechanism */
export interface TextFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<string, TRaw> {
  type: 'text';
  /** Placeholder text for the input */
  placeholder?: string;
}

/** Defines a numerical filter mechanism */
export interface NumberFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<number, TRaw> {
  type: 'number';
  /** Placeholder text for the input */
  placeholder?: string;
}

/** Defines a boolean toggle filter mechanism */
export interface BooleanFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<
  boolean,
  TRaw
> {
  type: 'boolean';
}

/** Defines a single-choice dropdown filter mechanism */
export interface SelectFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<string, TRaw> {
  type: 'select';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

/** Defines a multiple-choice selection filter mechanism */
export interface MultiSelectFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<
  string[],
  TRaw
> {
  type: 'multiselect';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

/** Defines an asynchronous single-choice dropdown fetching its options live */
export interface AsyncSelectFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<
  string,
  TRaw
> {
  type: 'async-select';
  /**
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

/** Defines an asynchronous multiple-choice selection mechanism fetching its options live */
export interface AsyncMultiSelectFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<
  string[],
  TRaw
> {
  type: 'async-multiselect';
  /**
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

/** Defines a numeric range (min/max) filter mechanism */
export interface RangeFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<
  { min?: string; max?: string },
  TRaw
> {
  type: 'range';
  /** Optional placeholder for the minimum input field */
  minPlaceholder?: string;
  /** Optional placeholder for the maximum input field */
  maxPlaceholder?: string;
}

/** Defines a date string filter mechanism */
export interface DateFilterDefinition<TRaw = unknown> extends BaseFilterDefinition<string, TRaw> {
  type: 'date';
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Discriminated union of all filter definitions.
 * By removing `TValue = any` here, consumers are forced to match the intrinsic
 * payload type (`string`, `string[]`, or `{min, max}`) based purely on the `type` tag.
 */
export type FilterDefinition<TRaw = unknown> =
  | TextFilterDefinition<TRaw>
  | NumberFilterDefinition<TRaw>
  | BooleanFilterDefinition<TRaw>
  | SelectFilterDefinition<TRaw>
  | MultiSelectFilterDefinition<TRaw>
  | AsyncSelectFilterDefinition<TRaw>
  | AsyncMultiSelectFilterDefinition<TRaw>
  | RangeFilterDefinition<TRaw>
  | DateFilterDefinition<TRaw>;

/**
 * An array of filter definitions that abstracts away the specific transformation types,
 * used when collecting heterogenous filters (e.g. text, range, boolean) into a single API options list.
 */

/**
 * Creates a suite of filter building functions that are statically bound
 * to the generic type `TRaw` of the expected Provider responses.
 *
 * This prevents repetitive `<any, RAWGGame>` boilerplate on every individual filter definition.
 * @returns An exact factory suite enforcing the TRaw constraints.
 */
export function createFilterSuite<TRaw>() {
  return {
    /**
     * Build a text filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed TextFilterDefinition.
     */
    text: (config: Omit<TextFilterDefinition<TRaw>, 'type'>): TextFilterDefinition<TRaw> => {
      return { ...config, type: 'text' };
    },

    /**
     * Build a numerical filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed NumberFilterDefinition.
     */
    number: (config: Omit<NumberFilterDefinition<TRaw>, 'type'>): NumberFilterDefinition<TRaw> => {
      return { ...config, type: 'number' };
    },

    /**
     * Build a boolean toggle filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed BooleanFilterDefinition.
     */
    boolean: (
      config: Omit<BooleanFilterDefinition<TRaw>, 'type'>,
    ): BooleanFilterDefinition<TRaw> => {
      return { ...config, type: 'boolean' };
    },

    /**
     * Build a single-choice dropdown filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed SelectFilterDefinition.
     */
    select: (config: Omit<SelectFilterDefinition<TRaw>, 'type'>): SelectFilterDefinition<TRaw> => {
      return { ...config, type: 'select' };
    },

    /**
     * Build a multiple-choice selection filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed MultiSelectFilterDefinition.
     */
    multiselect: (
      config: Omit<MultiSelectFilterDefinition<TRaw>, 'type'>,
    ): MultiSelectFilterDefinition<TRaw> => {
      return { ...config, type: 'multiselect' };
    },

    /**
     * Build an asynchronous single-choice dropdown fetching its options live
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed AsyncSelectFilterDefinition.
     */
    asyncSelect: (
      config: Omit<AsyncSelectFilterDefinition<TRaw>, 'type'>,
    ): AsyncSelectFilterDefinition<TRaw> => {
      return { ...config, type: 'async-select' };
    },

    /**
     * Build an asynchronous multiple-choice selection parameter fetching its options live
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed AsyncMultiSelectFilterDefinition.
     */
    asyncMultiselect: (
      config: Omit<AsyncMultiSelectFilterDefinition<TRaw>, 'type'>,
    ): AsyncMultiSelectFilterDefinition<TRaw> => {
      return { ...config, type: 'async-multiselect' };
    },

    /**
     * Build a max/min scope range filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed RangeFilterDefinition.
     */
    range: (config: Omit<RangeFilterDefinition<TRaw>, 'type'>): RangeFilterDefinition<TRaw> => {
      return { ...config, type: 'range' };
    },

    /**
     * Build a strict date constraint filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed DateFilterDefinition.
     */
    date: (config: Omit<DateFilterDefinition<TRaw>, 'type'>): DateFilterDefinition<TRaw> => {
      return { ...config, type: 'date' };
    },
  };
}
