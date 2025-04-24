// src/auth/dto/register.dto.ts
import { CreateUserDto } from '../../users/dto/create-user.dto';

// Extendemos de CreateUserDto porque el registro utiliza los mismos campos
export class RegisterDto extends CreateUserDto {}
