import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email.service';
import { Order } from '@prisma/client';
import {
  mapOrderStatusToSpanish,
  mapOrderStatusDescription,
} from '../../orders/utils/map-order-status';

@Injectable()
export class SendOrderStatusUpdateEmailUseCase {
  private readonly logger = new Logger(SendOrderStatusUpdateEmailUseCase.name);

  constructor(private emailService: EmailService) {}

  /**
   * Envía email de notificación cuando el estado de una orden cambia
   */
  async execute(order: Order): Promise<void> {
    try {
      const templateVariables = {
        orderNumber: order.orderNumber,
        customerName: order.name,
        status: mapOrderStatusToSpanish(order.status),
        description: mapOrderStatusDescription(order.status),
      };

      await this.emailService.sendOrderStatusUpdateEmail(
        order.email,
        templateVariables,
      );

      this.logger.log(
        `Order status update email sent for order ${order.orderNumber} (status: ${order.status}) to ${order.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending order status update email for order ${order.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // No lanzar excepción para no interrumpir el flujo de actualización de estado
    }
  }
}
