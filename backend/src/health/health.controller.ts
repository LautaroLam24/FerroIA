import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

interface HealthResponse {
  data: { status: 'ok' };
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return { data: { status: 'ok' } };
  }
}
