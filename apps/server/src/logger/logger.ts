import type { LoggerService } from '@nestjs/common';
import { pino, type Logger, type LoggerOptions } from 'pino';

/**
 * Paths pino replaces with "[redacted]" before a log line is written (spec 12.1 A09).
 * Covers request headers, common body fields and nested objects one level down.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'token',
  'email',
  'secret',
  '*.password',
  '*.token',
  '*.email',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
];

export function createLogger(options: { level: string; pretty: boolean }): Logger {
  const config: LoggerOptions = {
    level: options.level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    base: { service: 'server' },
  };
  if (options.pretty) config.transport = { target: 'pino-pretty', options: { singleLine: true } };
  return pino(config);
}

/** Adapts pino to Nest's LoggerService so framework logs are structured JSON too. */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, context?: string) {
    this.logger.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.logger.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.logger.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.logger.trace({ context }, String(message));
  }
}
