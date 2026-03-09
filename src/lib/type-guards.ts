/**
 * @file type-guards.ts
 * @description Generic TypeScript type guards to safely narrow unknown types.
 */

/**
 * Safely guards if an unknown value is a non-null object.
 * Useful for checking if an thrown error is an object before safely extracting properties like `status` or `message`.
 * @param e - The unknown value to check.
 * @returns True if `e` is an object and not null.
 */
export const isObject = (e: unknown): e is Record<string, unknown> => typeof e === 'object' && e !== null;
