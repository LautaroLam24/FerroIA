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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SuppliersService } from './suppliers.service';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
@Roles(Role.ADMIN)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  async create(@Body() dto: CreateSupplierDto) {
    return { data: await this.suppliersService.create(dto) };
  }

  @Get()
  async findAll() {
    return { data: await this.suppliersService.findAll() };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return { data: await this.suppliersService.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.suppliersService.remove(id);
  }
}
