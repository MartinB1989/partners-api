import { IsEnum, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'El status es requerido' })
  @IsEnum(OrderStatus, {
    message:
      'El status debe ser uno de: PENDING_PAYMENT, PENDING, PROCESSING, SHIPPED, READY_FOR_PICKUP, DELIVERED, CANCELLED',
  })
  status: OrderStatus;

  @IsOptional()
  @IsBoolean({ message: 'El campo force debe ser un booleano' })
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'boolean') return value;
    return false;
  })
  force?: boolean = false;
}
