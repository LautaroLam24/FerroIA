import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEntryDto {
  @IsUUID('4', { message: 'El producto indicado no es válido' })
  productId!: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  quantity!: number;

  @IsString({ message: 'El motivo debe ser un texto' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  reason!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener un formato válido' })
  date?: string;
}
