// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Role } from '@prisma/client';
import { RefreshTokenService } from './refresh-token.service';
import { TokenResponseDto } from './dto/token-response.dto';
import { TOKEN_CONSTANTS } from './constants/token.constants';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async register(
    registerDto: RegisterDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: TokenResponseDto }> {
    // Crear usuario
    const user = await this.usersService.create(registerDto);

    // Generar ambos tokens (access + refresh)
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      deviceInfo,
      ipAddress,
    );

    return { user, tokens }; // Ahora retorna "tokens" (plural)
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: TokenResponseDto }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar ambos tokens
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      deviceInfo,
      ipAddress,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return {
      user: result,
      tokens, // Ahora retorna "tokens" (plural)
    };
  }

  async adminLogin(
    adminLoginDto: AdminLoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: TokenResponseDto }> {
    const user = await this.usersService.findByEmail(adminLoginDto.email);

    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const hasValidRole = user.roles.some(
      (role) => role === Role.ADMIN || role === Role.PRODUCTOR,
    );

    if (!hasValidRole) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder al panel de administración',
      );
    }

    // Generar ambos tokens
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      deviceInfo,
      ipAddress,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return {
      user: result,
      tokens, // Ahora retorna "tokens" (plural)
    };
  }

  /**
   * 🔄 REFRESH TOKENS
   *
   * El cliente envía su refresh token y recibe un nuevo par
   * Implementa rotación automática (token viejo se invalida)
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<TokenResponseDto> {
    // 1. Validar refresh token (y detectar robo)
    const tokenRecord =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    // 2. Marcar token actual como usado (no puede volver a usarse)
    await this.refreshTokenService.markTokenAsUsed(tokenRecord.id);

    // 3. Generar nuevo par de tokens con MISMO family ID (rotación)
    const newTokens = await this.generateTokenPair(
      tokenRecord.userId,
      tokenRecord.user.email,
      deviceInfo,
      ipAddress,
      tokenRecord.family, // ← Mismo family para rastrear cadena
    );

    return newTokens;
  }

  /**
   * 🚪 LOGOUT
   *
   * Invalida el refresh token específico que envió el cliente
   */
  async logout(refreshToken: string): Promise<void> {
    const tokenRecord =
      await this.refreshTokenService.validateRefreshToken(refreshToken);
    await this.refreshTokenService.revokeToken(tokenRecord.id);
  }

  /**
   * 🚪 LOGOUT ALL DEVICES
   *
   * Cierra TODAS las sesiones del usuario (todos sus tokens)
   */
  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * 🎫 GENERAR PAR DE TOKENS (privado)
   *
   * Crea access token (JWT) + refresh token (opaco en DB)
   *
   * @param familyId - Opcional. Si se proporciona, el nuevo token pertenece a la misma familia (rotación)
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    deviceInfo?: string,
    ipAddress?: string,
    familyId?: string, // Si viene, es rotación. Si no, es login nuevo
  ): Promise<TokenResponseDto> {
    // 1. Generar access token (JWT de 15 minutos)
    const accessToken = this.generateAccessToken(userId, email);

    // 2. Crear familia nueva o usar la existente
    const family = familyId || crypto.randomUUID();

    // 3. Crear refresh token (opaco, guardado en DB)
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      userId,
      family,
      deviceInfo,
      ipAddress,
    );

    // 4. Retornar ambos tokens
    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_CONSTANTS.ACCESS_TOKEN_EXPIRATION_SECONDS, // 900 segundos
      tokenType: 'Bearer',
    };
  }

  /**
   * 🔐 GENERAR ACCESS TOKEN (privado)
   *
   * Crea JWT firmado con JWT_SECRET
   */
  private generateAccessToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
