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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@Roles(Role.ADMIN)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return { data: await this.categoriesService.create(dto) };
  }

  @Get()
  async findAll() {
    return { data: await this.categoriesService.findAll() };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return { data: await this.categoriesService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
