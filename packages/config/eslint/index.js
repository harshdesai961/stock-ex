// Shared ESLint flat-config building blocks. Each workspace's eslint.config.js
// composes the pieces it needs, e.g. [...base(import.meta.dirname), ...node()].
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const IGNORES = ['dist/**', '.next/**', 'coverage/**', 'next-env.d.ts', 'migrations/**'];

/** Type-aware TypeScript rules plus the security plugin. */
export function base(tsconfigRootDir) {
  return tseslint.config(
    { ignores: IGNORES },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    security.configs.recommended,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        eqeqeq: ['error', 'always'],
      },
    },
    {
      // Plain JS config files are not part of any tsconfig project.
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      ...tseslint.configs.disableTypeChecked,
    },
    prettier,
  );
}

/** Node.js apps and scripts. */
export function node() {
  return [{ languageOptions: { globals: globals.node } }];
}

/** React / Next.js code. dangerouslySetInnerHTML is banned outright (spec A05). */
export function react() {
  return [
    {
      files: ['**/*.tsx'],
      plugins: { 'react-hooks': reactHooks },
      languageOptions: { globals: globals.browser },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'no-restricted-syntax': [
          'error',
          {
            selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
            message: 'dangerouslySetInnerHTML is forbidden: render text through React instead.',
          },
        ],
      },
    },
  ];
}

/**
 * The game engine must stay pure and deterministic: no I/O, no frameworks,
 * no wall clock and no unseeded randomness. The linter enforces it.
 */
export function engine() {
  return [
    {
      files: ['src/**/*.ts'],
      ignores: ['src/sim/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['node:*'], message: 'The engine is pure: no Node built-ins.' },
              {
                group: ['fs', 'path', 'crypto', 'http', 'https', 'net', 'child_process', 'os'],
                message: 'The engine is pure: no I/O.',
              },
              {
                group: [
                  '@nestjs/*',
                  'next',
                  'next/*',
                  'react',
                  'ioredis',
                  'bullmq',
                  'drizzle-orm',
                  'socket.io*',
                ],
                message: 'The engine must not depend on frameworks or infrastructure.',
              },
            ],
          },
        ],
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'Use the seeded PRNG in src/rng.' },
          { object: 'Date', property: 'now', message: 'The engine never reads the clock.' },
        ],
        'no-restricted-globals': [
          'error',
          { name: 'process', message: 'The engine never reads the environment.' },
          { name: 'crypto', message: 'Seeds come from the server; use src/rng.' },
        ],
      },
    },
  ];
}
