import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import jsdoc from 'eslint-plugin-jsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  jsdoc.configs['flat/recommended-typescript'],
  sonarjs.configs.recommended,
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
      'sonarjs/cognitive-complexity': ['warn', 25],
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/no-nested-conditional': 'off',
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
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },

  // Test-specific overrides
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**'],
    rules: {
      'sonarjs/no-nested-functions': 'off',
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
