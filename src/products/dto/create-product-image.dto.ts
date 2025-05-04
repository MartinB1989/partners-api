import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  key: string;

  @IsBoolean()
  main: boolean = false;

  @IsNumber()
  @Min(0)
  order: number = 0;
}
