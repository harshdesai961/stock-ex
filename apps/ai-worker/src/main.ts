import { loadEnvOrExit, workerEnvSchema } from '@stock-ex/shared/env';

// The AI worker is off unless FEATURE_AI=true (spec 11.1: zero-account local dev).
// In Milestone 6 it consumes BullMQ jobs for the LangGraph bot and market commentator.
const env = loadEnvOrExit('ai-worker', workerEnvSchema);

if (!env.FEATURE_AI) {
  console.warn('[ai-worker] AI features are disabled (FEATURE_AI=false); exiting.');
  process.exit(0);
}

console.warn('[ai-worker] FEATURE_AI=true, but the worker is implemented in Milestone 6; exiting.');
process.exit(0);
