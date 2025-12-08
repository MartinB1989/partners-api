import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { Order, OrderItem } from '@prisma/client';
import { MERCADOPAGO_CONFIG } from './mercadopago.constants';
import * as crypto from 'crypto';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly client: MercadoPagoConfig;
  private readonly preference: Preference;
  private readonly payment: Payment;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not defined');
    }

    this.client = new MercadoPagoConfig({
      accessToken,
    });

    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  async createPreference(
    order: Order & { items: OrderItem[] },
  ): Promise<{ preferenceId: string; initPoint: string }> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const backendUrl = this.configService.get<string>('BACKEND_URL');
      console.log('frontendUrl', frontendUrl);
      console.log('backendUrl', backendUrl);
      const preferenceData = {
        items: [
          {
            id: order.orderNumber,
            title: `Orden #${order.orderNumber}`,
            quantity: 1,
            unit_price: Number(order.total),
            currency_id: MERCADOPAGO_CONFIG.CURRENCY,
          },
        ],
        payer: {
          name: order.name,
          email: order.email,
          phone: {
            number: order.phone || undefined,
          },
        },
        back_urls: {
          success: `${frontendUrl}/checkout/success`,
          failure: `${frontendUrl}/checkout/failure`,
          pending: `${frontendUrl}/checkout/pending`,
        },
        auto_return: 'approved' as const,
        notification_url: `${backendUrl}/api/webhooks/mercadopago`,
        external_reference: order.orderNumber,
        metadata: {
          order_id: order.id,
          delivery_type: order.deliveryType,
        },
      };

      this.logger.log(
        `Creating preference for order ${order.orderNumber}: ${JSON.stringify(preferenceData)}`,
      );

      const response = await this.preference.create({ body: preferenceData });

      if (!response.id || !response.init_point) {
        throw new Error('Invalid response from Mercado Pago');
      }

      this.logger.log(
        `Preference created successfully: ${response.id} for order ${order.orderNumber}`,
      );

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
      };
    } catch (error) {
      this.logger.error(
        `Error creating preference for order ${order.orderNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      this.logger.log(`Fetching payment information for ID: ${paymentId}`);

      const response = await this.payment.get({ id: paymentId });

      this.logger.log(
        `Payment info retrieved successfully: ${JSON.stringify(response)}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error fetching payment ${paymentId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  validateWebhookSignature(body: any, signature: string): boolean {
    try {
      const secret = this.configService.get<string>(
        'MERCADOPAGO_WEBHOOK_SECRET',
      );

      if (!secret) {
        this.logger.warn('MERCADOPAGO_WEBHOOK_SECRET is not configured');
        return false;
      }

      const hash = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Webhook signature validation failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `Error validating webhook signature: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
