/**
 * @file array.ts
 * @description Array utility functions for manipulating elements.
 */

/**
 * Moves an item within an array to a new index, returning a new array copy.
 * Mimics the behavior of arrayMove but removes the third-party dependency.
 * @param array - The source array.
 * @param from - The original index.
 * @param to - The target index.
 * @returns A new array with the item repositioned.
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const cloned = [...array];
  const item = cloned.splice(from, 1)[0];
  cloned.splice(to, 0, item);
  return cloned;
}
