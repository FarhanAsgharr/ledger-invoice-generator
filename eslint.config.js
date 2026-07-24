import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The app is browser-only and never phones home; console is the log sink.
      // `info` carries the export diagnostics in src/lib/pdf.ts.
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },
  {
    // Providers ship with their `use*` hook, and the template kit ships shared
    // primitives beside its components. Both are deliberate co-location; the
    // only cost is a slower Fast Refresh in dev.
    files: [
      'src/context/**/*.tsx',
      'src/components/preview/InvoiceSheet.tsx',
      'src/components/preview/templates/shared.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
