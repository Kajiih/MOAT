/**
 * @file lucene-evaluator.ts
 * @description Utility to evaluate parsed Lucene queries against objects.
 * This is used ONLY for testing to simulate complex API filtering logic.
 */

import lucene, { LuceneAST } from 'lucene';

import { logger } from '@/lib/logger';

/**
 * Checks if a mock item matches a Lucene query string.
 * @param query - The Lucene query string (e.g., 'artist:"Nirvana" AND year:1991').
 * @param item - The object to test against.
 * @param fieldMap - Optional mapping from Lucene fields to object keys.
 * @returns True if the item matches the query.
 */
export function matchesQuery(
  query: string,
  item: Record<string, unknown>,
  fieldMap?: Record<string, string>,
): boolean {
  if (!query) return true;

  try {
    const ast = lucene.parse(query);
    return evaluateNode(ast, item, fieldMap);
  } catch (error) {
    logger.error({ error, query }, 'Lucene Parse Error');
    return false;
  }
}

/**
 * Evaluates binary operators (AND, OR, NOT).
 * @param node - The AST node.
 * @param item - The item to evaluate.
 * @param fieldMap - Field mapping.
 * @returns The boolean result of the operator.
 */
function evaluateOperators(
  node: LuceneAST,
  item: Record<string, unknown>,
  fieldMap?: Record<string, string>,
): boolean | null {
  if (node.operator === 'AND' || node.operator === '&&') {
    return evaluateNode(node.left, item, fieldMap) && evaluateNode(node.right, item, fieldMap);
  }
  if (node.operator === 'AND NOT') {
    return evaluateNode(node.left, item, fieldMap) && !evaluateNode(node.right, item, fieldMap);
  }
  if (node.operator === 'OR' || node.operator === '||') {
    return evaluateNode(node.left, item, fieldMap) || evaluateNode(node.right, item, fieldMap);
  }
  if (node.operator === 'OR NOT') {
    return evaluateNode(node.left, item, fieldMap) || !evaluateNode(node.right, item, fieldMap);
  }
  if (node.operator === 'NOT' || node.operator === '!' || node.start === 'NOT') {
    return !evaluateNode(node.left || node.right, item, fieldMap);
  }
  return null;
}

/**
 * Helper to evaluate a range query.
 * @param node - The AST node.
 * @param itemValue - The value to check.
 * @returns True if matches.
 */
function evaluateRange(node: LuceneAST, itemValue: unknown): boolean {
  const val = Number(itemValue);
  const min =
    node.term_min === '*' || node.term_min === undefined ? -Infinity : Number(node.term_min);
  const max =
    node.term_max === '*' || node.term_max === undefined ? Infinity : Number(node.term_max);
  return val >= min && val <= max;
}

/**
 * Helper to evaluate a simple term match.
 * @param node - The AST node.
 * @param itemValue - The value to check.
 * @returns True if matches.
 */
function evaluateSimpleTermMatch(node: LuceneAST, itemValue: unknown): boolean {
  if (node.term === undefined) return true;

  const term = node.term.toLowerCase();
  const valStr = String(itemValue).toLowerCase();

  // Support Wildcard
  if (term.includes('*')) {
    const regex = new RegExp('^' + term.replaceAll('*', '.*') + '$');
    const valTerms = valStr.split(/[\s,.;:!?()\[\]{}"]+/);
    return valTerms.some((t) => regex.test(t));
  }

  // Support Fuzzy
  if (node.similarity) {
    return valStr.includes(term.slice(0, -1));
  }

  return valStr.includes(term);
}

/**
 * Evaluates a single term or range.
 * @param node - The AST node.
 * @param item - The item to evaluate.
 * @param fieldMap - Field mapping.
 * @returns The boolean result of the term evaluation.
 */
function evaluateTerm(
  node: LuceneAST,
  item: Record<string, unknown>,
  fieldMap?: Record<string, string>,
): boolean {
  const field = fieldMap && node.field ? fieldMap[node.field] : node.field;

  let itemValue: unknown;
  if (!field || field === '<implicit>') {
    itemValue = Object.values(item).flat().join(' ').toLowerCase();
  } else {
    itemValue = item[field];
  }

  if (itemValue === undefined || itemValue === null) return false;

  // Handle range queries
  if (node.term_min !== undefined || node.term_max !== undefined) {
    return evaluateRange(node, itemValue);
  }

  // Handle simple terms
  return evaluateSimpleTermMatch(node, itemValue);
}

/**
 * Recursively evaluate an AST node.
 * @param node - The AST node to evaluate.
 * @param item - The item to test against.
 * @param fieldMap - Field mapping.
 * @returns True if matches.
 */
function evaluateNode(
  node: LuceneAST | undefined,
  item: Record<string, unknown>,
  fieldMap?: Record<string, string>,
): boolean {
  if (!node) return true;

  // 1. Handle Operators
  const opResult = evaluateOperators(node, item, fieldMap);
  if (opResult !== null) return opResult;

  // 2. Handle nested nodes without operators
  if (node.left && !node.right && !node.operator) {
    return evaluateNode(node.left, item, fieldMap);
  }

  // 3. Handle Single Terms / Fields / Ranges
  if (node.term !== undefined || node.term_min !== undefined || node.term_max !== undefined) {
    return evaluateTerm(node, item, fieldMap);
  }

  return true;
}
