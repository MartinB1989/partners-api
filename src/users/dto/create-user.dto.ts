// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  roles?: Role[];
}
