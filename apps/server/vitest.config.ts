import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Nest relies on legacy decorators plus emitted type metadata (like tsc's
  // experimentalDecorators + emitDecoratorMetadata); ask Vite's oxc transformer for both.
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'] } },
      // Needs Postgres and Redis running (docker compose up -d, or CI service containers).
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.int.test.ts'],
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
    ],
  },
});
