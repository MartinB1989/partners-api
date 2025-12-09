import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {}

  @Post('mercadopago')
  @Public()
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    try {
      this.logger.log(
        `Webhook received - Request ID: ${requestId}, Signature: ${signature ? 'present' : 'missing'}`,
      );
      this.logger.log(`Webhook body: ${JSON.stringify(body)}`);

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
