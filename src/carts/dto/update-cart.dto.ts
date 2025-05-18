import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DeliveryType } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from './create-cart.dto';

export class UpdateCartDto extends PartialType(CreateCartDto) {
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;
}
