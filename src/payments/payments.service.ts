import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
  ) {}

  async createPayment(orderId: number, paymentMethod: PaymentMethod) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment) {
      return existingPayment;
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        paymentMethod,
        status: PaymentStatus.PENDING,
        amount: order.total,
        currency: 'ARS',
      },
    });

    this.logger.log(
      `Payment created for order ${orderId}: ${payment.id} with status ${payment.status}`,
    );

    return payment;
  }

  async initiateMercadoPagoPayment(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `La orden debe estar en estado PENDING_PAYMENT para iniciar el pago`,
      );
    }

    let payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      payment = await this.createPayment(orderId, PaymentMethod.MERCADOPAGO);
    }

    const { preferenceId, initPoint } =
      await this.mercadoPagoService.createPreference(order);

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        preferenceId,
      },
    });

    this.logger.log(
      `MercadoPago preference created for order ${orderId}: ${preferenceId}`,
    );

    return {
      preferenceId,
      initPoint,
      payment: updatedPayment,
    };
  }

  async updatePaymentStatus(
    externalId: string,
    status: PaymentStatus,
    metadata?: any,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { externalId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Pago con externalId ${externalId} no encontrado`,
      );
    }

    if (payment.status === status) {
      this.logger.log(
        `Payment ${payment.id} already has status ${status}, skipping update`,
      );
      return payment;
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        metadata: metadata || payment.metadata,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Payment ${payment.id} status updated from ${payment.status} to ${status}`,
    );

    return updatedPayment;
  }

  async updatePaymentByOrderNumber(
    orderNumber: string,
    externalId: string,
    status: PaymentStatus,
    metadata?: any,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(
        `Orden con orderNumber ${orderNumber} no encontrada`,
      );
    }

    if (!order.payment) {
      throw new NotFoundException(
        `No se encontró pago asociado a la orden ${orderNumber}`,
      );
    }

    if (order.payment.status === status) {
      this.logger.log(
        `Payment ${order.payment.id} already has status ${status}, skipping update`,
      );
      return order.payment;
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        externalId,
        status,
        metadata: metadata || order.payment.metadata,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Payment ${order.payment.id} for order ${orderNumber} updated to status ${status}`,
    );

    return updatedPayment;
  }

  async getPaymentByOrderId(orderId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `No se encontró pago para la orden ${orderId}`,
      );
    }

    return payment;
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
    }

    return payment;
  }

  mapPaymentStatusToOrderStatus(paymentStatus: PaymentStatus): OrderStatus {
    switch (paymentStatus) {
      case PaymentStatus.APPROVED:
        return OrderStatus.PENDING;
      case PaymentStatus.REJECTED:
      case PaymentStatus.CANCELLED:
        return OrderStatus.CANCELLED;
      case PaymentStatus.PENDING:
      case PaymentStatus.IN_PROCESS:
      default:
        return OrderStatus.PENDING_PAYMENT;
    }
  }
}
