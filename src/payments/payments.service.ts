import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  MercadoPagoService,
  SplitPaymentOptions,
} from './mercadopago/mercadopago.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { decrypt } from '../common/utils/encryption.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
    private configService: ConfigService,
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
        items: {
          include: {
            product: {
              select: { userId: true },
            },
          },
        },
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

    // Determinar si usar split payment (cuenta del vendedor) o cuenta principal
    let splitOptions: SplitPaymentOptions | undefined;

    // Obtener sellerId del primer producto (ya validado que todos son del mismo vendedor en orders.service.ts)
    const sellerId = order.items[0]?.product?.userId;

    if (sellerId) {
      const sellerMPAccount = await this.prisma.mPSplitAccount.findUnique({
        where: { userId: sellerId },
      });

      if (sellerMPAccount) {
        // Verificar si el token no está expirado
        const now = new Date();
        const isTokenExpired = sellerMPAccount.expiresAt < now;

        if (isTokenExpired) {
          this.logger.warn(
            `Seller ${sellerId} MercadoPago token expired at ${sellerMPAccount.expiresAt}. Using platform account for order ${orderId}`,
          );
        } else {
          try {
            const encryptionSecret =
              this.configService.get<string>('ENCRYPTION_SECRET');

            if (!encryptionSecret) {
              throw new Error('ENCRYPTION_SECRET is not configured');
            }

            const sellerAccessToken = decrypt(
              sellerMPAccount.accessToken,
              encryptionSecret,
            );

            // Calcular marketplace fee
            const feePercentage = this.configService.get<number>(
              'MARKETPLACE_FEE_PERCENTAGE',
              10,
            );
            const feeCap = this.configService.get<number>(
              'MARKETPLACE_FEE_CAP_ARS',
              5000,
            );
            const calculatedFee = (Number(order.total) * feePercentage) / 100;
            const marketplaceFee = Math.min(calculatedFee, feeCap);

            splitOptions = {
              sellerAccessToken,
              marketplaceFee,
            };

            this.logger.log(
              `Using split payment for order ${orderId} - Seller: ${sellerId}, Fee: ${marketplaceFee} ARS`,
            );
          } catch (error) {
            this.logger.error(
              `Error preparing split payment for order ${orderId}: ${error.message}. Falling back to platform account.`,
              error.stack,
            );
            // Si falla la preparación del split payment, usar la cuenta principal
            splitOptions = undefined;
          }
        }
      } else {
        this.logger.log(
          `Seller ${sellerId} does not have MercadoPago account linked. Using platform account for order ${orderId}`,
        );
      }
    }

    const { preferenceId, initPoint } =
      await this.mercadoPagoService.createPreference(order, splitOptions);

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
