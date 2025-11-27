import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
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
  weight: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  length: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  height: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  width: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  sku: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
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
