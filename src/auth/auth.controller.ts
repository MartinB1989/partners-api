// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminProducerGuard } from './guards/admin-producer.guard';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro: máximo 5 por hora por IP
  @Throttle({ long: { ttl: 3600000, limit: 5 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    // Extraer info del cliente para auditoría
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.register(registerDto, deviceInfo, ipAddress);
  }

  // Login: máximo 5 intentos por minuto
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.login(loginDto, deviceInfo, ipAddress);
  }

  // Admin login: máximo 3 intentos por 5 minutos
  @Throttle({ long: { ttl: 300000, limit: 3 } })
  @UseGuards(AdminProducerGuard)
  @Post('admin/login')
  async adminLogin(@Body() adminLoginDto: AdminLoginDto, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.adminLogin(adminLoginDto, deviceInfo, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: Omit<User, 'password'>) {
    return user;
  }

  /**
   * 🔄 REFRESH - Obtener nuevo access token
   *
   * POST /api/auth/refresh
   * Body: { "refreshToken": "..." }
   *
   * Rate limit: 20 requests por minuto (saltea los límites globales 'short' y 'long')
   */
  @SkipThrottle({ short: true, long: true }) // Saltea los límites globales para evitar 429s innecesarios
  @Throttle({ medium: { ttl: 60000, limit: 20 } }) // Solo aplica límite de 20/minuto
  @Post('refresh')
  @HttpCode(HttpStatus.OK) // Retorna 200 en vez de 201
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      deviceInfo,
      ipAddress,
    );
  }

  /**
   * 🚪 LOGOUT - Cerrar sesión actual
   *
   * POST /api/auth/logout
   * Body: { "refreshToken": "..." }
   *
   * Invalida SOLO el token enviado (este dispositivo)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Sesión cerrada correctamente' };
  }

  /**
   * 🚪 LOGOUT ALL - Cerrar todas las sesiones
   *
   * POST /api/auth/logout-all
   * Headers: Authorization: Bearer <access-token>
   *
   * Requiere estar autenticado
   * Invalida TODOS los tokens del usuario (todos los dispositivos)
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: Omit<User, 'password'>) {
    await this.authService.logoutAll(user.id);
    return { message: 'Todas las sesiones cerradas correctamente' };
  }
}
