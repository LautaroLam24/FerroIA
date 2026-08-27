import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @IsUUID('4', { message: 'El proveedor indicado no es válido' })
  proveedorId!: string;

  @IsArray({ message: 'items debe ser una lista' })
  @ArrayNotEmpty({ message: 'La orden debe tener al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}
