import { base, node } from '@stock-ex/config/eslint';

export default [
  ...base(import.meta.dirname),
  ...node(),
  {
    rules: {
      // Nest modules and DTOs are classes by design.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
