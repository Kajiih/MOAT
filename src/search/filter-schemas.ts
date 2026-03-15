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

/**
 * A primitive value that can be cleanly serialized into an API query parameter.
 */
export type FilterOutputValue = string | number | boolean | string[];

/**
 * Valid output type mapping returned by a filter's transform function.
 */
export type FilterOutputRecord = Record<string, FilterOutputValue>;

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
   * Evaluates to true if the final URL request sent to the provider's API
   * is strictly different from the URL request sent when NO filters are applied.
   * This proves the filter definition actually alters the backend fetch logic.
   * Defaults to `false` (meaning the test RUNS by default). Set to `true` to explicitly disable this check for 
   * filters that might legitimately not alter the query under certain conditions.
   */
  skipQueryDifferenceTest?: boolean;

  /**
   * If true, this test is expected to fail. Useful for tracking known issues
   * with provider implementation that are tracked but not yet fixed.
   */
  expectToFail?: boolean;

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
export interface BaseFilterDefinition<
  TValue = unknown,
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> {
  /** Unique ID for the filter (used as key in internal state) */
  id: string;
  /** Human readable label for the UI */
  label: string;
  /** Default value for the filter state */
  defaultValue?: TValue;
  /** Optional helper text shown to the user */
  helperText?: string;

  /**
   * The transformation function to convert the UI value to an API parameter.
   * Returns an object representing the API parameters to merge into the request payload.
   */
  transform: (value: TValue) => TOutput;
  /**
   * Defines test cases to verify this filter correctly narrows results.
   */
  testCases: FilterTestCase<TValue, TRaw>[];
}

/** Defines a text-based filter mechanism */
export interface TextFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string, TRaw, TOutput> {
  type: 'text';
  /** Placeholder text for the input */
  placeholder?: string;
}

/** Defines a numerical filter mechanism */
export interface NumberFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<number, TRaw, TOutput> {
  type: 'number';
  /** Placeholder text for the input */
  placeholder?: string;
}

/** Defines a boolean toggle filter mechanism */
export interface BooleanFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<boolean, TRaw, TOutput> {
  type: 'boolean';
}

/** Defines a single-choice dropdown filter mechanism */
export interface SelectFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string, TRaw, TOutput> {
  type: 'select';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

/** Defines a multiple-choice selection filter mechanism */
export interface MultiSelectFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string[], TRaw, TOutput> {
  type: 'multiselect';
  /** Available options for selection-based inputs */
  options: FilterOption[];
}

/** Defines an asynchronous single-choice dropdown fetching its options live */
export interface AsyncSelectFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string, TRaw, TOutput> {
  type: 'async-select';
  /**
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

/** Defines an asynchronous multiple-choice selection mechanism fetching its options live */
export interface AsyncMultiSelectFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string[], TRaw, TOutput> {
  type: 'async-multiselect';
  /**
   * Specifies the ID of the entity within the SAME provider to search against.
   * E.g., 'developer' or 'author'.
   */
  targetEntityId: string;
}

/** Defines a numeric range (min/max) filter mechanism */
export interface RangeFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<{ min?: string; max?: string }, TRaw, TOutput> {
  type: 'range';
  /** Optional placeholder for the minimum input field */
  minPlaceholder?: string;
  /** Optional placeholder for the maximum input field */
  maxPlaceholder?: string;
}

/** Defines a date string filter mechanism */
export interface DateFilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> extends BaseFilterDefinition<string, TRaw, TOutput> {
  type: 'date';
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Discriminated union of all filter definitions.
 * By removing `TValue = any` here, consumers are forced to match the intrinsic
 * payload type (`string`, `string[]`, or `{min, max}`) based purely on the `type` tag.
 */
export type FilterDefinition<
  TRaw = unknown,
  TOutput extends FilterOutputRecord = FilterOutputRecord,
> =
  | TextFilterDefinition<TRaw, TOutput>
  | NumberFilterDefinition<TRaw, TOutput>
  | BooleanFilterDefinition<TRaw, TOutput>
  | SelectFilterDefinition<TRaw, TOutput>
  | MultiSelectFilterDefinition<TRaw, TOutput>
  | AsyncSelectFilterDefinition<TRaw, TOutput>
  | AsyncMultiSelectFilterDefinition<TRaw, TOutput>
  | RangeFilterDefinition<TRaw, TOutput>
  | DateFilterDefinition<TRaw, TOutput>;

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
export function createFilterSuite<TRaw, TSuiteOutput extends FilterOutputRecord = FilterOutputRecord>() {
  return {
    /**
     * Build a text filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed TextFilterDefinition.
     */
    text: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<TextFilterDefinition<TRaw, TOutput>, 'type'>,
    ): TextFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'text' };
    },

    /**
     * Build a numerical filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed NumberFilterDefinition.
     */
    number: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<NumberFilterDefinition<TRaw, TOutput>, 'type'>,
    ): NumberFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'number' };
    },

    /**
     * Build a boolean toggle filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed BooleanFilterDefinition.
     */
    boolean: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<BooleanFilterDefinition<TRaw, TOutput>, 'type'>,
    ): BooleanFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'boolean' };
    },

    /**
     * Build a single-choice dropdown filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed SelectFilterDefinition.
     */
    select: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<SelectFilterDefinition<TRaw, TOutput>, 'type'>,
    ): SelectFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'select' };
    },

    /**
     * Build a multiple-choice selection filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed MultiSelectFilterDefinition.
     */
    multiselect: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<MultiSelectFilterDefinition<TRaw, TOutput>, 'type'>,
    ): MultiSelectFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'multiselect' };
    },

    /**
     * Build an asynchronous single-choice dropdown fetching its options live
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed AsyncSelectFilterDefinition.
     */
    asyncSelect: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<AsyncSelectFilterDefinition<TRaw, TOutput>, 'type'>,
    ): AsyncSelectFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'async-select' };
    },

    /**
     * Build an asynchronous multiple-choice selection parameter fetching its options live
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed AsyncMultiSelectFilterDefinition.
     */
    asyncMultiselect: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<AsyncMultiSelectFilterDefinition<TRaw, TOutput>, 'type'>,
    ): AsyncMultiSelectFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'async-multiselect' };
    },

    /**
     * Build a max/min scope range filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed RangeFilterDefinition.
     */
    range: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<RangeFilterDefinition<TRaw, TOutput>, 'type'>,
    ): RangeFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'range' };
    },

    /**
     * Build a strict date constraint filter parameter
     * @param config - The filter configuration object without the literal type constraint.
     * @returns A strongly typed DateFilterDefinition.
     */
    date: <TOutput extends FilterOutputRecord = TSuiteOutput>(
      config: Omit<DateFilterDefinition<TRaw, TOutput>, 'type'>,
    ): DateFilterDefinition<TRaw, TOutput> => {
      return { ...config, type: 'date' };
    },
  };
}

/**
 * Convenience helper to generate a basic `transform` function representing
 * a 1-to-1 payload mapping.
 * @param key - The backend API parameter key to map to.
 * @returns A transform function returning a valid `Record<string, string>`
 */
export const mapTo = <T, K extends PropertyKey>(key: K) => (val: T): Record<K, string> => ({
  [key]: String(val),
} as Record<K, string>);
