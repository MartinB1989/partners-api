import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';
import { Order } from '@prisma/client';

@Injectable()
export class SendOrderConfirmationEmailUseCase {
  private readonly logger = new Logger(SendOrderConfirmationEmailUseCase.name);

  constructor(private emailService: EmailService) {}

  /**
   * Envía email de confirmación de compra cuando una orden se completa
   */
  async execute(order: Order & { items?: any[] }): Promise<void> {
    try {
      const templateVariables = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        orderNumber: order.orderNumber,
        customerName: order.name,
        email: order.email,
        total: order.total,
        deliveryPrice: order.deliveryPrice,
        itemsPriceSum: order.itemsPriceSum,
        deliveryType: order.deliveryType,
        status: order.status,
        createdAt: order.createdAt,
        itemsCount: order.items?.length || 0,
      };

      await this.emailService.sendOrderConfirmationEmail(
        order.email,
        templateVariables,
      );

      this.logger.log(
        `Order confirmation email sent for order ${order.orderNumber} to ${order.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending order confirmation email for order ${order.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // No lanzar excepción para no interrumpir el flujo de creación de orden
      // pero loguear el error
    }
  }
}
