import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, type HealthReport } from './health.service.js';

interface StatusResponse {
  status(code: number): StatusResponse;
}

/** GET /health: used by the uptime monitor and `pnpm healthcheck`. Reveals only up/down. */
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  @SkipThrottle()
  async get(@Res({ passthrough: true }) res: StatusResponse): Promise<HealthReport> {
    const report = await this.health.check();
    res.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
