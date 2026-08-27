import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@Roles(Role.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return { data: await this.productsService.create(dto) };
  }

  @Get()
  @Roles(Role.ADMIN, Role.OPERARIO)
  async findAll(@Query() query: QueryProductsDto) {
    const { items, total, page, pageSize } =
      await this.productsService.findAll(query);
    return { data: items, meta: { total, page, pageSize } };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return { data: await this.productsService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }
}
