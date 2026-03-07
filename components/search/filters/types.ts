import { BaseFilterDefinition, FilterDefinition } from '@/lib/database/types';

/**
 * Standardized props for all filter input components.
 * @template T - The specific type of FilterDefinition this component expects.
 */
export interface FilterControlProps<
  T extends BaseFilterDefinition<any, any> = FilterDefinition
> {
  /** The filter definition object powering this control. */
  filter: T;
  /** The current value of the filter in the panel's state. */
  value: T extends BaseFilterDefinition<infer V, any> ? V : any;
  /** Callback to notify the parent when the value changes. */
  onChange: (value: (T extends BaseFilterDefinition<infer V, any> ? V : any) | undefined) => void;
}
