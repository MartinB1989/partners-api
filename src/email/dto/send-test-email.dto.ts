import { IsEmail, IsOptional, IsObject } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsObject()
  @IsOptional()
  templateVariables?: Record<string, any>;
}
