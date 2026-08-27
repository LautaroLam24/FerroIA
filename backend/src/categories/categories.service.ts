import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

type PublicCategory = Prisma.CategoryGetPayload<{
  select: typeof categorySelect;
}>;

const CATEGORY_DUPLICATED = 'Ya existe una categoría con ese nombre';
const CATEGORY_NOT_FOUND = 'Categoría no encontrada';
const CATEGORY_HAS_PRODUCTS =
  'No se puede eliminar: la categoría tiene productos asociados';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<PublicCategory> {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(CATEGORY_DUPLICATED);
    }

    try {
      return await this.prisma.category.create({
        data: { name: dto.name },
        select: categorySelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(CATEGORY_DUPLICATED);
      }
      throw error;
    }
  }

  async findAll(): Promise<Array<PublicCategory & { productCount: number }>> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        ...categorySelect,
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    }));
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<PublicCategory> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(CATEGORY_NOT_FOUND);
    }

    if (dto.name !== undefined) {
      const duplicate = await this.prisma.category.findFirst({
        where: { name: dto.name, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException(CATEGORY_DUPLICATED);
      }
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: { ...(dto.name !== undefined && { name: dto.name }) },
        select: categorySelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(CATEGORY_DUPLICATED);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(CATEGORY_NOT_FOUND);
    }

    const activeProducts = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (activeProducts > 0) {
      throw new ConflictException(CATEGORY_HAS_PRODUCTS);
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(CATEGORY_HAS_PRODUCTS);
      }
      throw error;
    }
  }
}
