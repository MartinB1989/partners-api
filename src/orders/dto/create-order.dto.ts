import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DeliveryType } from '@prisma/client';

export class CreateOrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(0)
  @Max(999999)
  unitPrice: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  @Max(9999)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(0)
  @Max(999999999)
  subTotal: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class CreateOrderAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  country?: string = 'Argentina';
}

export class CreateOrderDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  name: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/^\+?[0-9]+$/, {
    message:
      'El teléfono solo puede contener números y opcionalmente el símbolo + al principio',
  })
  phone?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(999999999)
  total: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999999)
  deliveryPrice?: number;

  @IsEnum(DeliveryType)
  @IsNotEmpty()
  deliveryType: DeliveryType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  address?: CreateOrderAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
