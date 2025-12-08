import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePreferenceDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;
}
