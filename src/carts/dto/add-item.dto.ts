import { IsInt, IsPositive, Min, Max } from 'class-validator';

export class AddItemDto {
  @IsInt()
  @IsPositive()
  productId: number;

  @IsInt()
  @Min(1)
  @Max(9999)
  quantity: number;
}
