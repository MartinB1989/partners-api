import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(3)
  level: number;

  @IsOptional()
  @IsInt()
  parentId?: number;
}
