import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductSizeDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999)
  weight: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999)
  length: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999)
  height: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999)
  width: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(999999)
  stock: number;

  @IsBoolean()
  active: boolean = true;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ProductSizeDto)
  size: ProductSizeDto;

  @IsArray()
  @ArrayMinSize(1, { message: 'El producto debe tener al menos una categoría' })
  @ArrayMaxSize(5, {
    message: 'El producto no puede tener más de 5 categorías',
  })
  @IsNumber({}, { each: true })
  categoryIds: number[];
}
