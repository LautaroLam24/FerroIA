import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { StockService } from './stock.service';

@Controller('stock')
@Roles(Role.ADMIN, Role.OPERARIO)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('entries')
  async createEntry(
    @Body() dto: CreateEntryDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return { data: await this.stockService.createEntry(dto, req.user.userId) };
  }

  @Post('sales')
  async createSale(
    @Body() dto: CreateSaleDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return { data: await this.stockService.createSale(dto, req.user.userId) };
  }

  @Get('movements')
  async findAll(@Query() query: ListMovementsQueryDto) {
    return { data: await this.stockService.findAll(query) };
  }
}
