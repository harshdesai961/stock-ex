# Third-party notices

stock-ex ships or bundles the components below. Each keeps its own licence.
Update this file in the same PR that adds a font, sound, image or runtime library
that reaches users' browsers or our production images.

## Runtime libraries (bundled into the web app or server)

| Component | Licence | Used in |
|---|---|---|
| Next.js | MIT | web |
| React, React DOM | MIT | web |
| lucide-react | ISC | web |
| simple-icons | CC0-1.0 | web (brand logos on sign-in buttons) |
| Better Auth (`better-auth`, `@better-auth/*`) | MIT | web (accounts) |
| @marsidev/react-turnstile | MIT | web (sign-up bot check) |
| Nodemailer | MIT-0 | web (server side: sending email) |
| Tailwind CSS | MIT | web (build time; generated CSS shipped) |
| NestJS (`@nestjs/*`) | MIT | server |
| Express (via `@nestjs/platform-express`) | MIT | server |
| helmet | MIT | server |
| ioredis | MIT | server |
| pino | MIT | server |
| reflect-metadata | Apache-2.0 | server |
| RxJS | Apache-2.0 | server |
| Drizzle ORM | Apache-2.0 | web, server, db |
| postgres (postgres.js) | Unlicense | web, server, db |
| Zod | MIT | all |

Development-only tools (ESLint, Prettier, Vitest, Playwright, axe-core, Turborepo,
TypeScript, Husky, lint-staged, tsx, drizzle-kit) are not shipped to users.

## Fonts, sounds and images

| Asset | Licence | Source | Used in |
|---|---|---|---|
| Fredoka (font) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Fredoka | web: headings and buttons (self-hosted by `next/font`) |
| Nunito (font) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Nunito | web: body text (self-hosted by `next/font`) |
| Lucide icons (`lucide-react`) | ISC | https://lucide.dev | web: all interface icons |
| Brand logos via Simple Icons (`simple-icons`) | CC0-1.0 (the icon files); the logos themselves are trademarks of their owners | https://simpleicons.org | web: Google, Discord, Facebook, X and Apple sign-in buttons only |

All artwork (the board-track hero, the game token, the logo mark) is original SVG drawn for this project, and the interface uses icons instead of emoji. Sounds will be CC0 only (spec section 10); list each with its source URL.

## Attribution requirements

- **TradingView Lightweight Charts** (from M3/M5): Apache-2.0 with a required attribution
  link to TradingView on pages that show the charts.
