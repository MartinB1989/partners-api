import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

/**
 * DTO para la creación de una dirección de retiro
 * Contiene los campos necesarios para registrar una nueva ubicación donde los
 * compradores pueden retirar sus productos
 */
export class CreatePickupAddressDto {
  /**
   * Nombre o descripción corta de la dirección de retiro
   * Ejemplo: "Tienda Principal", "Depósito Central"
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Nombre de la calle o avenida
   */
  @IsString()
  @IsNotEmpty()
  street: string;

  /**
   * Número de puerta o altura
   */
  @IsString()
  @IsNotEmpty()
  number: string;

  /**
   * Ciudad o localidad
   */
  @IsString()
  @IsNotEmpty()
  city: string;

  /**
   * Provincia o estado
   */
  @IsString()
  @IsNotEmpty()
  state: string;

  /**
   * Código postal
   */
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  /**
   * País (por defecto "Argentina")
   */
  @IsString()
  @IsOptional()
  country?: string;

  /**
   * Información adicional como piso, departamento, referencias, etc.
   */
  @IsString()
  @IsOptional()
  additionalInfo?: string;

  /**
   * Coordenada de latitud para ubicación geográfica
   */
  @IsNumber()
  @IsOptional()
  latitude?: number;

  /**
   * Coordenada de longitud para ubicación geográfica
   */
  @IsNumber()
  @IsOptional()
  longitude?: number;

  /**
   * Indica si la dirección está activa para retiros
   * Por defecto es true
   */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
