import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'El contacto debe ser un texto' })
  contact?: string | null;
}
