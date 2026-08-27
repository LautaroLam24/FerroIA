import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../src/auth/decorators/roles.decorator';

interface AdminOnlyResponse {
  data: { ok: true };
}

@Controller('test/admin-only')
export class AdminOnlyTestController {
  @Roles(Role.ADMIN)
  @Get()
  check(): AdminOnlyResponse {
    return { data: { ok: true } };
  }
}
