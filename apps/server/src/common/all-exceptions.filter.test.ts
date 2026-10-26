import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toErrorResponse } from './all-exceptions.filter.js';

describe('toErrorResponse', () => {
  it('passes client errors through with a stable code', () => {
    expect(toErrorResponse(new NotFoundException('Room not found'))).toEqual({
      status: 404,
      body: { code: 'NOT_FOUND', message: 'Room not found' },
    });
    expect(toErrorResponse(new BadRequestException('Bad quantity')).body.code).toBe('BAD_REQUEST');
  });

  it('hides the message of server errors', () => {
    const result = toErrorResponse(new InternalServerErrorException('db password is wrong'));
    expect(result.status).toBe(500);
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it('hides unknown errors and their stacks', () => {
    const error = new Error('connect ECONNREFUSED 10.0.0.5:5432');
    const result = toErrorResponse(error);
    expect(result).toEqual({
      status: 500,
      body: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' },
    });
  });
});
