import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsString({ message: 'El código debe ser un texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  code!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  description?: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price!: number;

  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock!: number;

  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  stockMin!: number;

  @IsUUID('4', { message: 'La categoría indicada no es válida' })
  categoryId!: string;

  @IsUUID('4', { message: 'El proveedor indicado no es válido' })
  supplierId!: string;
}
