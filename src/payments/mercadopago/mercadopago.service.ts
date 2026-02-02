import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { Order, OrderItem, DeliveryType } from '@prisma/client';
import { MERCADOPAGO_CONFIG } from './mercadopago.constants';
import * as crypto from 'crypto';

export interface SplitPaymentOptions {
  sellerAccessToken: string;
  marketplaceFee: number;
}

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
    splitOptions?: SplitPaymentOptions,
  ): Promise<{ preferenceId: string; initPoint: string }> {
    try {
      const preferenceClient = this.getPreferenceClient(
        order.orderNumber,
        splitOptions,
      );
      const items = this.buildPreferenceItems(order);
      const preferenceData = this.buildPreferenceData(
        order,
        items,
        splitOptions,
      );

      this.logger.log(
        `Creating preference for order ${order.orderNumber}: ${JSON.stringify(preferenceData)}`,
      );

      const response = await preferenceClient.create({ body: preferenceData });
      this.validatePreferenceResponse(response);

      this.logger.log(
        `Preference created successfully: ${response.id} for order ${order.orderNumber}`,
      );

      return {
        preferenceId: response.id,
        initPoint: response.init_point,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error creating preference for order ${order.orderNumber}: ${errorMessage}`,
        errorStack,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error fetching payment ${paymentId}: ${errorMessage}`,
        errorStack,
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

      const hash = this.calculateWebhookHash(body, secret);
      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Webhook signature validation failed');
      }

      return isValid;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error validating webhook signature: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Determina qué cliente de preferencia usar (vendedor o plataforma)
   */
  private getPreferenceClient(
    orderNumber: string,
    splitOptions?: SplitPaymentOptions,
  ): Preference {
    if (splitOptions) {
      const sellerClient = new MercadoPagoConfig({
        accessToken: splitOptions.sellerAccessToken,
      });
      this.logger.log(
        `Using seller's MercadoPago account for order ${orderNumber} with marketplace_fee: ${splitOptions.marketplaceFee}`,
      );
      return new Preference(sellerClient);
    }

    this.logger.log(
      `Using platform's MercadoPago account for order ${orderNumber}`,
    );
    return this.preference;
  }

  /**
   * Construye los items de la preferencia desde los OrderItems
   */
  private buildPreferenceItems(order: Order & { items: OrderItem[] }) {
    const items = order.items.map((item) => ({
      id: `${order.orderNumber}#${item.id}`,
      title: item.title,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      currency_id: MERCADOPAGO_CONFIG.CURRENCY,
    }));

    // Agregar costo de envío si es SHIPPING
    if (order.deliveryType === DeliveryType.SHIPPING && order.deliveryPrice) {
      items.push({
        id: `SHIP#${order.orderNumber}`,
        title: 'Costo de envío',
        quantity: 1,
        unit_price: Number(order.deliveryPrice),
        currency_id: MERCADOPAGO_CONFIG.CURRENCY,
      });
    }

    return items;
  }

  /**
   * Construye los datos del pagador
   */
  private buildPayerData(order: Order) {
    return {
      name: order.name,
      email: order.email,
      phone: {
        number: order.phone || undefined,
      },
    };
  }

  /**
   * Construye las URLs de retorno para la preferencia
   */
  private buildBackUrls() {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return {
      success: `${frontendUrl}/checkout/success`,
      failure: `${frontendUrl}/checkout/failure`,
      pending: `${frontendUrl}/checkout/pending`,
    };
  }

  /**
   * Construye el objeto completo de datos de la preferencia
   */
  private buildPreferenceData(
    order: Order,
    items: any[],
    splitOptions?: SplitPaymentOptions,
  ) {
    const backendUrl = this.configService.get<string>('BACKEND_URL');

    return {
      items,
      payer: this.buildPayerData(order),
      back_urls: this.buildBackUrls(),
      auto_return: 'approved' as const,
      notification_url: `${backendUrl}/api/webhooks/mercadopago`,
      external_reference: order.orderNumber,
      metadata: {
        order_id: order.id,
        delivery_type: order.deliveryType,
      },
      ...(splitOptions && { marketplace_fee: splitOptions.marketplaceFee }),
    };
  }

  /**
   * Valida que la respuesta de Mercado Pago contenga los datos necesarios
   */
  private validatePreferenceResponse(
    response: unknown,
  ): asserts response is { id: string; init_point: string } {
    if (
      !response ||
      typeof response !== 'object' ||
      !('id' in response) ||
      !('init_point' in response) ||
      typeof response.id !== 'string' ||
      typeof response.init_point !== 'string'
    ) {
      throw new Error('Invalid response from Mercado Pago');
    }
  }

  /**
   * Calcula el hash HMAC-SHA256 para validación de webhook
   */
  private calculateWebhookHash(body: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
  }
}
