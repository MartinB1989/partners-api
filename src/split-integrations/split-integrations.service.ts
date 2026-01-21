import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

interface MercadoPagoOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
  live_mode: boolean;
}

@Injectable()
export class SplitIntegrationsService {
  private readonly logger = new Logger(SplitIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async handleMPCode(code: string, userId: string) {
    try {
      const clientSecret = this.configService.get<string>(
        'MERCADOPAGO_CLIENT_SECRET',
      );
      const clientId = this.configService.get<string>('MERCADOPAGO_CLIENT_ID');
      const redirectUri = this.configService.get<string>(
        'MERCADOPAGO_REDIRECT_URI',
      );

      const response = await axios.post<MercadoPagoOAuthResponse>(
        'https://api.mercadopago.com/oauth/token',
        {
          client_secret: clientSecret,
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          state: userId,
        },
      );

      console.log('MercadoPago OAuth Response:', response.data);

      const {
        access_token,
        token_type,
        expires_in,
        scope,
        user_id,
        refresh_token,
        public_key,
        live_mode,
      } = response.data;

      // Calcular la fecha de expiración (expires_in está en segundos)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      // Guardar o actualizar en la base de datos
      const mpSplitAccount = await this.prisma.mPSplitAccount.upsert({
        where: { userId },
        create: {
          userId,
          accessToken: access_token,
          tokenType: token_type,
          expiresAt,
          scope,
          mpUserId: String(user_id),
          refreshToken: refresh_token,
          publicKey: public_key,
          liveMode: live_mode,
        },
        update: {
          accessToken: access_token,
          tokenType: token_type,
          expiresAt,
          scope,
          mpUserId: String(user_id),
          refreshToken: refresh_token,
          publicKey: public_key,
          liveMode: live_mode,
        },
      });

      this.logger.log(
        `MercadoPago account saved/updated for user ${userId}: ${mpSplitAccount.id}`,
      );

      return {
        success: true,
        message: 'Cuenta de Mercado Pago vinculada exitosamente',
        data: {
          id: mpSplitAccount.id,
          mpUserId: mpSplitAccount.mpUserId,
          publicKey: mpSplitAccount.publicKey,
          liveMode: mpSplitAccount.liveMode,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error exchanging code for token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
