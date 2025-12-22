import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  @Max(3)
  level: number;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
