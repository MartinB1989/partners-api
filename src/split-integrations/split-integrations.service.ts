import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

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

      const response = await axios.post(
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

      return {
        success: true,
        data: response.data,
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
