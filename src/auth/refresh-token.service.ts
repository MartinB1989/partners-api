import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken, User } from '@prisma/client';
import { generateRefreshToken } from './utils/generate-refresh-token';
import {
  hashRefreshToken,
  compareRefreshToken,
} from './utils/hash-refresh-token';

@Injectable()
export class RefreshTokenService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🆕 CREAR REFRESH TOKEN
   *
   * Se llama al hacer login o refresh
   *
   * @param userId - ID del usuario dueño
   * @param familyId - UUID de familia (para rotación)
   * @param deviceInfo - User-Agent (opcional)
   * @param ipAddress - IP del cliente (opcional)
   * @returns Token SIN hashear (para enviar al cliente)
   */
  async createRefreshToken(
    userId: string,
    familyId: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    // 1. Generar token aleatorio seguro
    const rawToken = generateRefreshToken();

    // 2. Hashear para guardar en DB
    const hashedToken = await hashRefreshToken(rawToken);

    // 3. Calcular fecha de expiración (7 días desde ahora)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 4. Guardar en base de datos
    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        family: familyId,
        expiresAt,
        deviceInfo,
        ipAddress,
      },
    });

    // 5. Retornar token SIN hashear (para enviarlo al cliente)
    return rawToken;
  }

  /**
   * ✅ VALIDAR REFRESH TOKEN
   *
   * Se llama cuando el cliente quiere refrescar su access token
   * Implementa detección de robo de tokens
   *
   * @param rawToken - Token que envió el cliente
   * @returns Registro de token de la DB (incluye usuario)
   */
  async validateRefreshToken(
    rawToken: string,
  ): Promise<RefreshToken & { user: User }> {
    // 1. Buscar todos los tokens no expirados en DB
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: { gte: new Date() }, // Mayor o igual a ahora
      },
      include: { user: true }, // Traer datos del usuario también
    });

    // 2. Comparar el hash del token con cada token en DB
    let matchedToken: (RefreshToken & { user: User }) | null = null;
    for (const token of tokens) {
      const matches = await compareRefreshToken(rawToken, token.token);
      if (matches) {
        matchedToken = token;
        break;
      }
    }

    // 3. Si no encontramos coincidencia, token inválido
    if (!matchedToken) {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // 4. 🔒 DETECCIÓN DE BRECHA DE SEGURIDAD
    // Si el token ya fue usado o revocado, alguien lo robó
    if (matchedToken.isUsed || matchedToken.isRevoked) {
      // Revocar toda la familia de tokens (seguridad)
      await this.revokeTokenFamily(matchedToken.family);

      throw new UnauthorizedException(
        'Token reutilizado detectado - sesión revocada por seguridad',
      );
    }

    // 5. Token válido, retornar
    return matchedToken;
  }

  /**
   * 📝 MARCAR TOKEN COMO USADO
   *
   * Después de un refresh exitoso, el token viejo no puede volver a usarse
   */
  async markTokenAsUsed(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        isUsed: true,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * 🚫 REVOCAR UN TOKEN ESPECÍFICO
   *
   * Se usa en logout normal (cerrar sesión de este dispositivo)
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  /**
   * 🔥 REVOCAR FAMILIA COMPLETA
   *
   * Se usa cuando detectamos robo (alguien intentó reusar un token)
   * Invalida TODOS los tokens de esa cadena de refreshes
   */
  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family: familyId },
      data: { isRevoked: true },
    });
  }

  /**
   * 🚫 REVOCAR TODOS LOS TOKENS DEL USUARIO
   *
   * Se usa en "logout from all devices" (cerrar todas las sesiones)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * 🧹 LIMPIAR TOKENS EXPIRADOS
   *
   * Se ejecutará con un cron job diariamente
   * Elimina tokens viejos para mantener la DB limpia
   */
  async deleteExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }, // Menor a ahora
      },
    });
    return result.count;
  }
}
