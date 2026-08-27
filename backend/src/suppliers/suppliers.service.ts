import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const supplierSelect = {
  id: true,
  name: true,
  contact: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

type PublicSupplier = Prisma.SupplierGetPayload<{
  select: typeof supplierSelect;
}>;

const SUPPLIER_DUPLICATED = 'Ya existe un proveedor con ese nombre';
const SUPPLIER_NOT_FOUND = 'Proveedor no encontrado';
const SUPPLIER_HAS_PRODUCTS =
  'No se puede eliminar: el proveedor tiene productos asociados';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto): Promise<PublicSupplier> {
    const existing = await this.prisma.supplier.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(SUPPLIER_DUPLICATED);
    }

    try {
      return await this.prisma.supplier.create({
        data: {
          name: dto.name,
          ...(dto.contact !== undefined && { contact: dto.contact }),
        },
        select: supplierSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(SUPPLIER_DUPLICATED);
      }
      throw error;
    }
  }

  async findAll(): Promise<Array<PublicSupplier & { productCount: number }>> {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      select: {
        ...supplierSelect,
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return suppliers.map(({ _count, ...supplier }) => ({
      ...supplier,
      productCount: _count.products,
    }));
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<PublicSupplier> {
    const existing = await this.prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(SUPPLIER_NOT_FOUND);
    }

    if (dto.name !== undefined) {
      const duplicate = await this.prisma.supplier.findFirst({
        where: { name: dto.name, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(SUPPLIER_DUPLICATED);
      }
    }

    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.contact !== undefined && { contact: dto.contact }),
        },
        select: supplierSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(SUPPLIER_DUPLICATED);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(SUPPLIER_NOT_FOUND);
    }

    const activeProducts = await this.prisma.product.count({
      where: { supplierId: id },
    });
    if (activeProducts > 0) {
      throw new ConflictException(SUPPLIER_HAS_PRODUCTS);
    }

    try {
      await this.prisma.supplier.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(SUPPLIER_HAS_PRODUCTS);
      }
      throw error;
    }
  }
}
