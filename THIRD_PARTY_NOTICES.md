# Third-party notices

stock-ex ships or bundles the components below. Each keeps its own licence.
Update this file in the same PR that adds a font, sound, image or runtime library
that reaches users' browsers or our production images.

## Runtime libraries (bundled into the web app or server)

| Component | Licence | Used in |
|---|---|---|
| Next.js | MIT | web |
| React, React DOM | MIT | web |
| Tailwind CSS | MIT | web (build time; generated CSS shipped) |
| NestJS (`@nestjs/*`) | MIT | server |
| Express (via `@nestjs/platform-express`) | MIT | server |
| helmet | MIT | server |
| ioredis | MIT | server |
| pino | MIT | server |
| reflect-metadata | Apache-2.0 | server |
| RxJS | Apache-2.0 | server |
| Drizzle ORM | Apache-2.0 | server, db |
| postgres (postgres.js) | Unlicense | server, db |
| Zod | MIT | all |

Development-only tools (ESLint, Prettier, Vitest, Playwright, axe-core, Turborepo,
TypeScript, Husky, lint-staged, tsx, drizzle-kit) are not shipped to users.

## Fonts, sounds and images

None yet. Sounds will be CC0 only (spec section 10), and fonts OFL; list each with its source URL.

## Attribution requirements

- **TradingView Lightweight Charts** (from M3/M5): Apache-2.0 with a required attribution
  link to TradingView on pages that show the charts.
