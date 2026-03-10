/**
 * Moves an item within an array to a new index, returning a new array copy.
 * Mimics the behavior of dnd-kit's arrayMove but removes the dependency.
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const cloned = [...array];
  const item = cloned.splice(from, 1)[0];
  cloned.splice(to, 0, item);
  return cloned;
}
