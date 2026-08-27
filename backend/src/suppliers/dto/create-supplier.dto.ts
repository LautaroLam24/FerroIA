import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'El contacto debe ser un texto' })
  contact?: string;
}
