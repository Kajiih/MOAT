/**
 * @file lucene-evaluator.ts
 * @description Utility to evaluate parsed Lucene queries against objects.
 * This is used ONLY for testing to simulate complex API filtering logic.
 */

import lucene from 'lucene';

/**
 * Checks if a mock item matches a Lucene query string.
 * @param query - The Lucene query string (e.g., 'artist:"Nirvana" AND year:1991').
 * @param item - The object to test against.
 * @param fieldMap - Optional mapping from Lucene fields to object keys.
 * @returns True if the item matches the query.
 */
export function matchesQuery(
  query: string,
  item: Record<string, any>,
  fieldMap?: Record<string, string>
): boolean {
  if (!query) return true;

  try {
    const ast = lucene.parse(query);
    return evaluateNode(ast, item, fieldMap);
  } catch (error) {
    console.error('Lucene Parse Error:', error, 'Query:', query);
    return false;
  }
}

/**
 * Recursively evaluate an AST node.
 */
function evaluateNode(node: any, item: Record<string, any>, fieldMap?: Record<string, string>): boolean {
  if (!node) return true;

  // 1. Handle Operators (AND, OR, NOT)
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

  // 2. Handle nested nodes without operators (sometimes parse results are wrapped)
  if (node.left && !node.right && !node.operator) {
      return evaluateNode(node.left, item, fieldMap);
  }

  // 3. Handle Single Terms / Fields / Ranges
  if (node.term !== undefined || node.term_min !== undefined || node.term_max !== undefined) {
    const field = fieldMap && node.field ? fieldMap[node.field] : node.field;
    
    // If field is missing or implicit, search all values
    let itemValue: any;
    if (!field || field === '<implicit>') {
        itemValue = Object.values(item).flat().join(' ');
    } else {
        itemValue = item[field];
    }
    
    if (itemValue === undefined || itemValue === null) return false;

    // Handle range queries
    if (node.term_min !== undefined || node.term_max !== undefined) {
        const val = Number(itemValue);
        const min = node.term_min === '*' || node.term_min === undefined ? -Infinity : Number(node.term_min);
        const max = node.term_max === '*' || node.term_max === undefined ? Infinity : Number(node.term_max);
        return val >= min && val <= max;
    }

    // Handle simple terms
    if (node.term !== undefined) {
      const term = node.term.toLowerCase();
      const valStr = String(itemValue).toLowerCase();

      // Support Wildcard (match against any term in the field)
      if (term.includes('*')) {
          const regex = new RegExp('^' + term.replace(/\*/g, '.*') + '$', 'i');
          const valTerms = valStr.split(/[\s,.;:!?()\[\]{}"]+/);
          return valTerms.some(t => regex.test(t));
      }

      // Support Fuzzy (just includes for simplicity in mocks)
      if (node.similarity) {
          return valStr.includes(term.slice(0, -1));
      }

      return valStr.includes(term);
    }
  }

  return true;
}
