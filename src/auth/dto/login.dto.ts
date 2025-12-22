// src/auth/dto/login.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
