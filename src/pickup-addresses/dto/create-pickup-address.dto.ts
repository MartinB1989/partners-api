import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
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
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /**
   * Nombre de la calle o avenida
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  street: string;

  /**
   * Número de puerta o altura
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  /**
   * Ciudad o localidad
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  city: string;

  /**
   * Provincia o estado
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  state: string;

  /**
   * Código postal
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode: string;

  /**
   * País (por defecto "Argentina")
   */
  @IsString()
  @IsOptional()
  @MaxLength(200)
  country?: string;

  /**
   * Información adicional como piso, departamento, referencias, etc.
   */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  additionalInfo?: string;

  /**
   * Coordenada de latitud para ubicación geográfica
   * Rango válido: -90 a 90
   */
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  /**
   * Coordenada de longitud para ubicación geográfica
   * Rango válido: -180 a 180
   */
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  /**
   * Indica si la dirección está activa para retiros
   * Por defecto es true
   */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
