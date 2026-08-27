import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryProductsDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'El código debe ser un texto' })
  code?: string;

  @IsOptional()
  @IsUUID('4', { message: 'La categoría indicada no es válida' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El proveedor indicado no es válido' })
  supplierId?: string;

  @IsOptional()
  @IsIn(['true', 'false'], { message: 'lowStock debe ser true o false' })
  lowStock?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize debe ser un número entero' })
  @Min(1, { message: 'pageSize debe ser mayor o igual a 1' })
  @Max(100, { message: 'pageSize debe ser menor o igual a 100' })
  pageSize?: number;
}
