import { IsString, IsOptional, IsObject } from 'class-validator';

export class MercadoPagoWebhookDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  data?: {
    id: string;
  };
}
