// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Role } from '../../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // La creación del usuario se delega al servicio de usuarios
    const user = await this.usersService.create(registerDto);

    // Generamos el token JWT para que el usuario esté autenticado inmediatamente después del registro
    const token = this.generateToken(user.id, user.email);

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    // Buscar usuario por email (con contraseña)
    const user = await this.usersService.findByEmail(loginDto.email);

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar token
    const token = this.generateToken(user.id, user.email);

    // Eliminar la contraseña del objeto usuario antes de devolverlo
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    // Buscar usuario por email (con contraseña)
    const user = await this.usersService.findByEmail(adminLoginDto.email);

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      console.log(user);
      console.log(isPasswordValid);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el usuario tiene el rol de ADMIN o PRODUCTOR
    const hasValidRole = user.roles.some(
      (role) => role === Role.ADMIN || role === Role.PRODUCTOR,
    );

    if (!hasValidRole) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder al panel de administración',
      );
    }

    // Generar token
    const token = this.generateToken(user.id, user.email);

    // Eliminar la contraseña del objeto usuario antes de devolverlo
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
