import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

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

  @IsArray()
  @ArrayMinSize(1, { message: 'El producto debe tener al menos una categoría' })
  @ArrayMaxSize(5, {
    message: 'El producto no puede tener más de 5 categorías',
  })
  @IsNumber({}, { each: true })
  categoryIds: number[];
}
