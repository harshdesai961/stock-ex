// Lints the root-level Node scripts (scripts/*.mjs). Each workspace has its own config.
import { base, node } from '@stock-ex/config/eslint';

export default [
  ...base(import.meta.dirname),
  ...node(),
  {
    // Setup scripts run on a developer's own machine with inputs from our own files
    // (.env, .env.example, package.json), never from users. They print to the terminal
    // by design, and these security rules only produce false positives here.
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
];
