import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdenCompraEstado, OrdenCompraOrigen, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

const purchaseOrderSelect = {
  id: true,
  estado: true,
  origen: true,
  createdBy: true,
  createdAt: true,
  proveedor: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      cantidadSugerida: true,
      producto: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.OrdenCompraSelect;

type PublicPurchaseOrder = Prisma.OrdenCompraGetPayload<{
  select: typeof purchaseOrderSelect;
}>;

const SUPPLIER_NOT_FOUND = 'El proveedor indicado no existe';
const PRODUCT_NOT_FOUND = 'Uno o más productos indicados no existen';
const ORDER_NOT_FOUND = 'Orden de compra no encontrada';
const NOT_DRAFT = 'La orden de compra no está en estado BORRADOR';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePurchaseOrderDto,
    userId: string,
    origen: OrdenCompraOrigen,
  ): Promise<PublicPurchaseOrder> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.proveedorId },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException(SUPPLIER_NOT_FOUND);
    }

    const productIds = [...new Set(dto.items.map((item) => item.productoId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(PRODUCT_NOT_FOUND);
    }

    return this.prisma.ordenCompra.create({
      data: {
        proveedorId: dto.proveedorId,
        createdBy: userId,
        origen,
        estado: OrdenCompraEstado.BORRADOR,
        items: {
          create: dto.items.map((item) => ({
            productoId: item.productoId,
            cantidadSugerida: item.cantidadSugerida,
          })),
        },
      },
      select: purchaseOrderSelect,
    });
  }

  async findAll(): Promise<PublicPurchaseOrder[]> {
    return this.prisma.ordenCompra.findMany({
      orderBy: { createdAt: 'desc' },
      select: purchaseOrderSelect,
    });
  }

  async findOne(id: string): Promise<PublicPurchaseOrder> {
    const order = await this.prisma.ordenCompra.findUnique({
      where: { id },
      select: purchaseOrderSelect,
    });
    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }
    return order;
  }

  async confirmar(id: string): Promise<PublicPurchaseOrder> {
    return this.transition(id, OrdenCompraEstado.CONFIRMADA);
  }

  async cancelar(id: string): Promise<PublicPurchaseOrder> {
    return this.transition(id, OrdenCompraEstado.CANCELADA);
  }

  private async transition(
    id: string,
    nextEstado: OrdenCompraEstado,
  ): Promise<PublicPurchaseOrder> {
    const order = await this.prisma.ordenCompra.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!order) {
      throw new NotFoundException(ORDER_NOT_FOUND);
    }
    if (order.estado !== OrdenCompraEstado.BORRADOR) {
      throw new ConflictException(NOT_DRAFT);
    }

    return this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: nextEstado },
      select: purchaseOrderSelect,
    });
  }
}
