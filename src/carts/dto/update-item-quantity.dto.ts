import { IsInt, Min, Max } from 'class-validator';

export class UpdateItemQuantityDto {
  @IsInt()
  @Min(1)
  @Max(9999)
  quantity: number;
}
