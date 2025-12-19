import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { Public } from '../../auth/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
  ) {}

  private validateSignature(
    signature: string,
    dataId: string,
    requestId: string,
  ): boolean {
    try {
      // Parse signature header: "ts=1766111897582,v1=36692d63dabe30e87fe421cfdc8e3dca8cd96232f544b2b04e1ef049b99a2161"
      const parts = signature.split(',');
      const ts = parts[0]?.split('=')[1];
      const hash = parts[1]?.split('=')[1];

      if (!ts || !hash) {
        this.logger.warn('Invalid signature format');
        return false;
      }

      // Get webhook secret from environment
      const secret = this.configService.get<string>(
        'MERCADOPAGO_WEBHOOK_SECRET',
      );

      if (!secret) {
        this.logger.error('MERCADOPAGO_WEBHOOK_SECRET not configured');
        return false;
      }

      // Build the message according to MercadoPago spec
      // Format: id:dataID;request-id:x-request-id;ts:timestamp;
      const message = `id:${dataId};request-id:${requestId};ts:${ts};`;

      this.logger.log(`Validating signature for message: ${message}`);

      // Generate HMAC-SHA256 hash
      const hmac = createHmac('sha256', secret);
      hmac.update(message);
      const calculatedHash = hmac.digest('hex');

      this.logger.log(`Received hash: ${hash}`);
      this.logger.log(`Calculated hash: ${calculatedHash}`);

      const isValid = calculatedHash === hash;

      // If validation fails, log detailed debug information
      if (!isValid) {
        this.logger.error('========================================');
        this.logger.error('WEBHOOK SIGNATURE VALIDATION FAILED');
        this.logger.error('========================================');
        this.logger.error(`Data ID: ${dataId}`);
        this.logger.error(`Request ID: ${requestId}`);
        this.logger.error(`Timestamp: ${ts}`);
        this.logger.error(`Message: ${message}`);
        this.logger.error(`Received Hash: ${hash}`);
        this.logger.error(`Calculated Hash: ${calculatedHash}`);
        this.logger.error('========================================');
      }

      this.logger.log(`Signature valid: ${isValid}`);

      return isValid;
    } catch (error) {
      this.logger.error(`Error validating signature: ${error.message}`);
      return false;
    }
  }

  // Webhooks: máximo 1000 por minuto (permitir alto volumen legítimo)
  @Throttle({ long: { ttl: 60000, limit: 1000 } })
  @Post('mercadopago')
  @Public()
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Query() queryParams: any,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    try {
      this.logger.log(
        `Webhook received - Request ID: ${requestId}, Signature: ${signature ? 'present' : 'missing'}`,
      );
      this.logger.log(`Query Params: ${JSON.stringify(queryParams)}`);
      this.logger.log(`Webhook body: ${JSON.stringify(body)}`);

      // Validate signature if present
      // Only process webhooks with new format: ?data.id=123456&type=payment
      // Legacy format webhooks (?id=123456&topic=payment or ?id=123456&topic=merchant_order) are ignored
      const dataId = queryParams['data.id'];

      // If webhook uses legacy format (only has 'id' and 'topic'), ignore it
      if (!dataId && queryParams['id'] && queryParams['topic']) {
        this.logger.log(
          `Legacy webhook format detected (id=${queryParams['id']}, topic=${queryParams['topic']}). Ignoring.`,
        );
        return {
          success: true,
          message: 'Legacy webhook format ignored',
        };
      }

      // Validate required parameters for new format
      if (!signature || !dataId || !requestId) {
        this.logger.error(
          'Missing required parameters for signature validation',
        );
        throw new UnauthorizedException(
          'Missing signature, data.id, or request-id',
        );
      }

      // Validate signature
      const isValid = this.validateSignature(signature, dataId, requestId);

      if (!isValid) {
        this.logger.error('Invalid webhook signature - request rejected');
        throw new UnauthorizedException('Invalid webhook signature');
      }

      this.logger.log('Signature validated successfully - processing webhook');

      const result =
        await this.webhooksService.handleMercadoPagoNotification(body);

      this.logger.log(
        `Webhook processed successfully: ${JSON.stringify(result)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }
}
