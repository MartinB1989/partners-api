import { PartialType } from '@nestjs/mapped-types';
import { CreatePickupAddressDto } from './create-pickup-address.dto';

/**
 * DTO para la actualización de una dirección de retiro
 * Extiende de CreatePickupAddressDto pero hace todos los campos opcionales
 * para permitir actualizaciones parciales
 */
export class UpdatePickupAddressDto extends PartialType(
  CreatePickupAddressDto,
) {}
