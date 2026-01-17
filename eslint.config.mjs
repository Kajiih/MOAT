import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import jsdoc from 'eslint-plugin-jsdoc'; // 1. Import the plugin

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,

  // 2. Add JSDoc enforcement for JS/TS files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**', '**/*.config.{js,ts,mjs,mts}'],
    plugins: {
      jsdoc,
    },
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
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
          },
        },
      ],
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
