/**
 * @file Filter Control Types
 * @description Standardized generic properties for filter UI components.
 */

import { BaseFilterDefinition, FilterDefinition } from '@/search/filter-schemas';

/**
 * Standardized props for all filter input components.
 * @template T - The specific type of FilterDefinition this component expects.
 */
export interface FilterControlProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends BaseFilterDefinition<any, any> = FilterDefinition
> {
  /** The filter definition object powering this control. */
  filter: T;
  /** The current value of the filter in the panel's state. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: T extends BaseFilterDefinition<infer V, any> ? V : any;
  /** Callback to notify the parent when the value changes. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: (T extends BaseFilterDefinition<infer V, any> ? V : any) | undefined) => void;
}
