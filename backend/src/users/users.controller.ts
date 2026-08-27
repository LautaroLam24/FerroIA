import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return { data: await this.usersService.create(dto) };
  }

  @Get()
  async findAll() {
    return { data: await this.usersService.findAll() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
