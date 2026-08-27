import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(Role.ADMIN, Role.OPERARIO)
  async summary() {
    return { data: await this.dashboardService.getSummary() };
  }
}
