import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DeliveryType } from '@prisma/client';

export class CreateCartDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;
}
