import {
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  street: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  state: string;

  @IsString()
  @MaxLength(20)
  zipCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  country?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
