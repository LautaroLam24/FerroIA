import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestockService } from './restock.service';

@Controller('restock')
@Roles(Role.ADMIN, Role.OPERARIO)
export class RestockController {
  constructor(private readonly restockService: RestockService) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggest() {
    return { data: await this.restockService.suggest() };
  }
}
