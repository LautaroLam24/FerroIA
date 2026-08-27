import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListMovementsQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'El producto indicado no es válido' })
  productId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha "from" debe tener un formato válido' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha "to" debe tener un formato válido' })
  to?: string;
}
