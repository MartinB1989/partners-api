import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from '../refresh-token.service';

@Injectable()
export class CleanupTokensTask {
  private readonly logger = new Logger(CleanupTokensTask.name);

  constructor(private refreshTokenService: RefreshTokenService) {}

  /**
   * 🧹 Se ejecuta DIARIAMENTE a las 3:00 AM
   *
   * Elimina tokens expirados de la base de datos
   * Mantiene la DB limpia y mejora rendimiento
   */
  // @Cron(CronExpression.EVERY_MINUTE) // TESTING: cada minuto
  @Cron(CronExpression.EVERY_DAY_AT_3AM) // Producción: cada día a las 3 AM
  async handleTokenCleanup() {
    this.logger.log('🧹 Iniciando limpieza de refresh tokens expirados...');

    try {
      const deletedCount = await this.refreshTokenService.deleteExpiredTokens();
      this.logger.log(
        `✅ Limpieza completada: ${deletedCount} tokens eliminados`,
      );
    } catch (error) {
      this.logger.error('❌ Error durante limpieza de tokens:', error);
    }
  }
}
