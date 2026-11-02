import { base, engine } from '@stock-ex/config/eslint';

export default [
  ...base(import.meta.dirname),
  ...engine(),
  {
    // The simulator is a Node CLI around the pure core: it may print and read argv.
    files: ['src/sim/**'],
    languageOptions: { parserOptions: { project: './tsconfig.sim.json', projectService: false } },
    rules: { 'no-console': 'off' },
  },
];
