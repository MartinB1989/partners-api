import { IsEmail, IsOptional, IsObject, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendTestEmailDto {
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  to: string;

  @IsObject()
  @IsOptional()
  templateVariables?: Record<string, any>;
}
