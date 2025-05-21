import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DeliveryType } from '@prisma/client';

export class CreateCartDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;
}
