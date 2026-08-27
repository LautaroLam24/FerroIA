import { IsInt, IsUUID, Min } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @IsUUID('4', { message: 'El producto indicado no es válido' })
  productoId!: string;

  @IsInt({ message: 'La cantidad sugerida debe ser un número entero' })
  @Min(1, { message: 'La cantidad sugerida debe ser mayor a 0' })
  cantidadSugerida!: number;
}
