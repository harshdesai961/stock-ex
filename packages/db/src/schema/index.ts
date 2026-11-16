// Drizzle table definitions (docs/PROJECT_SPEC.md section 7).
// M4 brings the Better Auth and profile tables; the game tables (games, game_players,
// game_events) follow the persistence proposal in docs/DECISIONS.md.
export { accounts, rateLimits, sessions, users, verifications } from './auth.js';
export { profiles } from './profiles.js';
