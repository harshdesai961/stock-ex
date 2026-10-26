import { base, node } from '@stock-ex/config/eslint';

export default [
  ...base(import.meta.dirname),
  ...node(),
  {
    // CLI scripts report progress on stdout and only touch paths built from constants.
    files: ['scripts/**'],
    rules: { 'no-console': 'off', 'security/detect-non-literal-fs-filename': 'off' },
  },
];
