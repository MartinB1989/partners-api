// src/users/dto/seller-settings-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class SellerSettingsResponseDto {
  @ApiProperty({
    description: 'ID de la configuración',
    example: 'uuid-here',
  })
  id: string;

  @ApiProperty({
    description: 'ID del usuario vendedor',
    example: 'user-uuid-here',
  })
  userId: string;

  @ApiProperty({
    description: 'Indica si el vendedor acepta envíos a domicilio',
    example: true,
  })
  acceptsHomeDelivery: boolean;

  @ApiProperty({
    description: 'Indica si el vendedor acepta retiro en persona',
    example: true,
  })
  acceptsPickup: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-01-01T12:00:00Z',
  })
  updatedAt: Date;
}
