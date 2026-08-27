import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'El código debe ser un texto' })
  @IsNotEmpty({ message: 'El código no puede estar vacío' })
  code?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;

  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  stockMin?: number;

  @IsOptional()
  @IsUUID('4', { message: 'La categoría indicada no es válida' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El proveedor indicado no es válido' })
  supplierId?: string;
}
