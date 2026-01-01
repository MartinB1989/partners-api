// src/users/dto/update-seller-settings.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSellerSettingsDto {
  @ApiProperty({
    description: 'Indica si el vendedor acepta envíos a domicilio',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'acceptsHomeDelivery debe ser un valor booleano' })
  acceptsHomeDelivery?: boolean;

  @ApiProperty({
    description: 'Indica si el vendedor acepta retiro en persona',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'acceptsPickup debe ser un valor booleano' })
  acceptsPickup?: boolean;
}
