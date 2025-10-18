// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'drizzle/**', '.vercel/**', 'node_modules/**', 'ui_docs/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
