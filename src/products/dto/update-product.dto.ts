import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import {
  IsArray,
  IsNumber,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'El producto debe tener al menos una categoría' })
  @ArrayMaxSize(5, {
    message: 'El producto no puede tener más de 5 categorías',
  })
  @IsNumber({}, { each: true })
  categoryIds?: number[];
}
