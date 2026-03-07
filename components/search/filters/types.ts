import { FilterDefinition } from '@/lib/database/types';

/**
 * Standardized props for all filter input components.
 * @template T - The specific type of FilterDefinition this component expects.
 * @template V - The type of the value managed by the filter.
 */
export interface FilterControlProps<
  T extends FilterDefinition = FilterDefinition,
  V = any
> {
  /** The filter definition object powering this control. */
  filter: T;
  /** The current value of the filter in the panel's state. */
  value: V | undefined;
  /** Callback to notify the parent when the value changes. */
  onChange: (value: V | undefined) => void;
}
