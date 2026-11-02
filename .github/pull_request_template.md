## What and why

<!-- One or two sentences. Link the issue: "Closes #123". -->

## How to test

<!-- Commands or steps a reviewer can run. -->

## Checklist

- [ ] Does what the issue and `docs/PROJECT_SPEC.md` say, and nothing unrelated
- [ ] Tests cover the new behaviour; `pnpm lint`, `pnpm typecheck`, `pnpm test` pass locally
- [ ] I could explain every line of this in an interview

### Security and privacy

- [ ] No secrets, tokens or real personal data in code, tests, logs or screenshots
- [ ] Every input from a client is validated with Zod on the server, with length limits
- [ ] Identity comes from the verified session/socket token, never from the payload
- [ ] Hidden game information (hands, deck order, seed) cannot reach the wrong player or a spectator
- [ ] New dependencies are justified in `docs/DECISIONS.md` (real, maintained, licence OK)
- [ ] New personal-data fields are listed in `docs/DATA_INVENTORY.md`
- [ ] `docs/THREAT_MODEL.md` updated if this adds an entry point or trust boundary
- [ ] New env variables added to `.env.example`, the Zod schema and `docs/DEVELOPMENT.md`
