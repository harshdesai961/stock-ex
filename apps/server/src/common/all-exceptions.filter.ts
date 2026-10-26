import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Logger } from 'pino';

export interface ErrorBody {
  code: string;
  message: string;
}

/**
 * Last line of defence for HTTP errors (spec 12.1 A10): clients get a stable code and a
 * short message, never a stack trace or internal detail. The full error goes to the log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: ErrorBody): void } }>();
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) this.logger.error({ err: exception }, 'unhandled exception');
    response.status(status).json(body);
  }
}

/** 404 → "NOT_FOUND" etc., built once from Nest's HttpStatus enum. */
const STATUS_NAMES = new Map(
  Object.entries(HttpStatus)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .map(([name, code]) => [code, name]),
);

export function toErrorResponse(exception: unknown): { status: number; body: ErrorBody } {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = STATUS_NAMES.get(status) ?? 'ERROR';
    // Only 4xx messages are written by us for the client; 5xx messages may leak internals.
    const message = status < 500 ? exception.message : 'Something went wrong.';
    return { status, body: { code, message } };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' },
  };
}
