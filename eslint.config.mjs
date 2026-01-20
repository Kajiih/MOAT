import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import jsdoc from 'eslint-plugin-jsdoc';
import playwright from 'eslint-plugin-playwright';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import vitest from 'eslint-plugin-vitest';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsdoc.configs['flat/recommended-typescript'],
  sonarjs.configs.recommended,
  unicorn.configs['recommended'],
  prettier,

  // General improvements
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      // Import Sorting
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Unused Imports
      'no-unused-vars': 'off', // Disable standard rule
      '@typescript-eslint/no-unused-vars': 'off', // Disable TS rule
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // SonarJS Overrides
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/unused-import': 'off',  // Handled by unused-imports plugin

      // Unicorn Overrides
      // Check these if we keep or remove
      'unicorn/filename-case': 'off', // Next.js often uses specific casing (e.g. page.tsx, route.ts) or PascalCase for components
      'unicorn/prevent-abbreviations': 'off', // Can be too aggressive
      'unicorn/no-null': 'off', // Null is common in React/TS
      'unicorn/prefer-module': 'off', // CommonJS/ESM interop issues in config files
      'unicorn/no-array-sort': 'off', // We often want in-place sorting or standard sort
      'unicorn/prefer-query-selector': 'off', // getElementById is faster and semantic
      'unicorn/consistent-function-scoping': 'off', // Can lead to weird code structure in React components
      'unicorn/no-array-for-each': 'off', // forEach is fine and sometimes preferred for side effects
      'unicorn/prefer-dom-node-append': 'off', // appendChild is standard
      'unicorn/explicit-length-check': 'off', // explicit length check is verbose
      'unicorn/prefer-add-event-listener': 'off', // onerror is fine for simple cases
      'unicorn/prefer-blob-reading-methods': 'off', // FileReader is standard
      'unicorn/no-negated-condition': 'off', // Negated conditions are fine
      'unicorn/prefer-ternary': 'off', // Ternaries can be hard to read
    },
  },

  // JSDoc enforcement for JS/TS files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**', '**/*.config.{js,ts,mjs,mts}'],
    rules: {
      // Force module-level documentation
      'jsdoc/require-file-overview': [
        'error',
        {
          tags: {
            file: { mustExist: true },
            description: { mustExist: true },
          },
        },
      ],
      // Optional: enforce JSDoc for exports (hooks, functions, etc.)
      'jsdoc/require-jsdoc': [
        'warn',
        {
          publicOnly: true,
          contexts: [
            'FunctionDeclaration',
            'ArrowFunctionExpression',
            'TSEnumDeclaration',
            'TSTypeAliasDeclaration',
            'TSInterfaceDeclaration',
          ],
          minLineCount: 5,
          enableFixer: false,
        },
      ],
    },
  },

  // Test-specific overrides
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**'],
    rules: {
      'sonarjs/no-nested-functions': 'off',
    },
  },

  // Vitest
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/max-nested-describe': ['error', { max: 3 }],
    },
  },

  // Playwright
  {
    files: ['e2e/**'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-skipped-test': 'off',
    },
  },

  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
