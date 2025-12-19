import { Injectable, Logger } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_STATUS_MAP } from '../mercadopago/mercadopago.constants';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { SendOrderConfirmationEmailUseCase } from '../../email/use-cases/send-order-confirmation-email.use-case';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private paymentsService: PaymentsService,
    private mercadoPagoService: MercadoPagoService,
    private prisma: PrismaService,
    private sendOrderConfirmationEmailUseCase: SendOrderConfirmationEmailUseCase,
  ) {}

  async handleMercadoPagoNotification(data: any) {
    try {
      this.logger.log(
        `Processing MercadoPago webhook notification: ${JSON.stringify(data)}`,
      );

      if (!data.data || !data.data.id) {
        this.logger.warn('Invalid webhook data received');
        return { success: false, message: 'Invalid webhook data' };
      }

      const paymentId = data.data.id;
      const paymentInfo = await this.mercadoPagoService.getPayment(paymentId);

      this.logger.log(
        `Payment info from MercadoPago: ${JSON.stringify(paymentInfo)}`,
      );

      const externalReference = paymentInfo.external_reference;
      const mpStatus = paymentInfo.status;
      const paymentStatus =
        PAYMENT_STATUS_MAP[mpStatus] || PaymentStatus.PENDING;

      if (!externalReference) {
        this.logger.warn('No external_reference found in payment info');
        return { success: false, message: 'No external reference' };
      }

      // Check current order status before processing
      const existingOrder = await this.prisma.order.findUnique({
        where: { orderNumber: externalReference },
        select: { id: true, status: true, orderNumber: true },
      });

      if (!existingOrder) {
        this.logger.warn(
          `Order not found for external reference: ${externalReference}`,
        );
        return { success: false, message: 'Order not found' };
      }

      // If order status is different from PENDING_PAYMENT, it's already been processed
      if (existingOrder.status !== OrderStatus.PENDING_PAYMENT) {
        this.logger.log(
          `Order ${existingOrder.orderNumber} already processed with status ${existingOrder.status}. Skipping webhook processing.`,
        );
        return {
          success: true,
          message: 'Order already processed',
          alreadyProcessed: true,
        };
      }

      const payment = await this.paymentsService.updatePaymentByOrderNumber(
        externalReference,
        paymentId,
        paymentStatus,
        {
          mercadoPagoData: paymentInfo,
          processedAt: new Date().toISOString(),
        },
      );

      const orderStatus =
        this.paymentsService.mapPaymentStatusToOrderStatus(paymentStatus);

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: orderStatus },
      });

      this.logger.log(
        `Order ${payment.orderId} status updated to ${orderStatus}`,
      );

      if (paymentStatus === PaymentStatus.APPROVED) {
        await this.handlePaymentApproved(payment.orderId);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error(
        `Error processing MercadoPago webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async handlePaymentApproved(orderId: number) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        this.logger.error(`Order ${orderId} not found for email confirmation`);
        return;
      }

      this.logger.log(
        `Sending order confirmation email for order ${order.orderNumber}`,
      );

      await this.sendOrderConfirmationEmailUseCase.execute(order);

      this.logger.log(
        `Order confirmation email sent successfully for order ${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending confirmation email for order ${orderId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
