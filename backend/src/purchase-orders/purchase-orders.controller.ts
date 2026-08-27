import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { OrdenCompraOrigen, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
@Roles(Role.ADMIN, Role.OPERARIO)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return {
      data: await this.purchaseOrdersService.create(
        dto,
        req.user.userId,
        OrdenCompraOrigen.MANUAL,
      ),
    };
  }

  @Post('assistant')
  async createFromAssistant(
    @Body() dto: CreatePurchaseOrderDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return {
      data: await this.purchaseOrdersService.create(
        dto,
        req.user.userId,
        OrdenCompraOrigen.ASISTENTE,
      ),
    };
  }

  @Get()
  async findAll() {
    return { data: await this.purchaseOrdersService.findAll() };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.purchaseOrdersService.findOne(id) };
  }

  @Patch(':id/confirmar')
  @Roles(Role.ADMIN)
  async confirmar(@Param('id') id: string) {
    return { data: await this.purchaseOrdersService.confirmar(id) };
  }

  @Patch(':id/cancelar')
  @Roles(Role.ADMIN)
  async cancelar(@Param('id') id: string) {
    return { data: await this.purchaseOrdersService.cancelar(id) };
  }
}
