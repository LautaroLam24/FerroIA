import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  price: true,
  stock: true,
  stockMin: true,
  categoryId: true,
  supplierId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

type PublicProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
export type ListableProduct = PublicProduct & { lowStock: boolean };

export interface PagedProducts {
  items: ListableProduct[];
  total: number;
  page: number;
  pageSize: number;
}

const PRODUCT_CODE_DUPLICATED = 'Ya existe un producto con ese código';
const PRODUCT_NOT_FOUND = 'Producto no encontrado';
const CATEGORY_NOT_FOUND = 'La categoría indicada no existe';
const SUPPLIER_NOT_FOUND = 'El proveedor indicado no existe';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(CATEGORY_NOT_FOUND);
    }
  }

  private async assertSupplierExists(supplierId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) {
      throw new BadRequestException(SUPPLIER_NOT_FOUND);
    }
  }

  async create(dto: CreateProductDto): Promise<PublicProduct> {
    const existing = await this.prisma.product.findUnique({
      where: { code: dto.code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(PRODUCT_CODE_DUPLICATED);
    }

    await this.assertCategoryExists(dto.categoryId);
    await this.assertSupplierExists(dto.supplierId);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          price: dto.price,
          stock: dto.stock,
          stockMin: dto.stockMin,
          categoryId: dto.categoryId,
          supplierId: dto.supplierId,
        },
        select: productSelect,
      });
      this.eventEmitter.emit('product.created', { id: product.id });
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(PRODUCT_CODE_DUPLICATED);
      }
      throw error;
    }
  }

  async findAll(query: QueryProductsDto): Promise<PagedProducts> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (query.name !== undefined) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }
    if (query.code !== undefined) {
      where.code = query.code;
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    if (query.supplierId !== undefined) {
      where.supplierId = query.supplierId;
    }
    if (query.lowStock === 'true') {
      where.stock = { lte: this.prisma.product.fields.stockMin };
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: productSelect,
      }),
    ]);

    return {
      items: products.map((product) => ({
        ...product,
        lowStock: product.stock <= product.stockMin,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findByIds(ids: string[]): Promise<ListableProduct[]> {
    if (ids.length === 0) {
      return [];
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: productSelect,
    });
    return products.map((product) => ({
      ...product,
      lowStock: product.stock <= product.stockMin,
    }));
  }

  async update(id: string, dto: UpdateProductDto): Promise<PublicProduct> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(PRODUCT_NOT_FOUND);
    }

    if (dto.code !== undefined) {
      const duplicate = await this.prisma.product.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(PRODUCT_CODE_DUPLICATED);
      }
    }

    if (dto.categoryId !== undefined) {
      await this.assertCategoryExists(dto.categoryId);
    }
    if (dto.supplierId !== undefined) {
      await this.assertSupplierExists(dto.supplierId);
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.stockMin !== undefined && { stockMin: dto.stockMin }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        },
        select: productSelect,
      });
      this.eventEmitter.emit('product.updated', { id: product.id });
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(PRODUCT_CODE_DUPLICATED);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(PRODUCT_NOT_FOUND);
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.eventEmitter.emit('product.deleted', { id });
  }
}
