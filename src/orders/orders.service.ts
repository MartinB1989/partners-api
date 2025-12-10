import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto';
import {
  Order,
  OrderStatus,
  Prisma,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { generateOrderNumber } from './utils/generate-order-number';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const {
      items,
      address,
      total,
      deliveryPrice,
      itemsPriceSum,
      ...orderData
    } = createOrderDto;

    // Verificar que los productos existan y tengan stock suficiente
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${item.productId} no encontrado`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto ${product.title}`,
        );
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Crear dirección para esta orden
        let addressId: string | undefined;

        if (address) {
          // Crear una dirección solo para esta orden
          const newAddress = await tx.address.create({
            data: {
              ...address,
            },
          });
          addressId = newAddress.id;
        }

        // Generar número de orden único
        const orderNumber = generateOrderNumber();

        // Crear la orden
        const newOrder = await tx.order.create({
          data: {
            ...orderData,
            orderNumber,
            addressId,
            total,
            deliveryPrice: deliveryPrice ?? 0,
            itemsPriceSum: itemsPriceSum ?? 0,
            status: OrderStatus.PENDING_PAYMENT,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                title: item.title,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                subTotal: item.subTotal,
                imageUrl: item.imageUrl,
              })),
            },
          },
          include: {
            items: true,
            address: true,
          },
        });

        // Actualizar el stock de los productos
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Crear registro de Payment asociado a la orden
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            paymentMethod: PaymentMethod.MERCADOPAGO,
            status: PaymentStatus.PENDING,
            amount: newOrder.total,
            currency: 'ARS',
          },
        });

        return newOrder;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Error al crear la orden');
      }
      throw error;
    }
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          deliveryPrice: true,
          deliveryType: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count(),
    ]);

    // Mapear los datos y calcular el total con deliveryPrice
    const ordersWithCalculatedTotal = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      finalTotal:
        order.total +
        (order.deliveryType === 'SHIPPING' ? order.deliveryPrice : 0),
      deliveryType: order.deliveryType,
      status: order.status,
      createdAt: order.createdAt,
      itemsCount: order.items.length,
    }));

    return {
      data: ordersWithCalculatedTotal,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    return order;
  }

  async updateOrderStatusByPayment(
    orderId: number,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    const orderStatus = this.mapPaymentStatusToOrderStatus(paymentStatus);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: orderStatus },
    });
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    force: boolean = false,
  ): Promise<{ status: OrderStatus }> {
    // Verificar que la orden exista
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // Validar que si la orden está en PENDING_PAYMENT, se requiera force = true
    if (order.status === OrderStatus.PENDING_PAYMENT && !force) {
      throw new BadRequestException(
        'No se puede actualizar una orden que esta pendiente de pago.',
      );
    }

    // Actualizar el status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      select: {
        status: true,
      },
    });

    return { status: updatedOrder.status };
  }

  private mapPaymentStatusToOrderStatus(
    paymentStatus: PaymentStatus,
  ): OrderStatus {
    switch (paymentStatus) {
      case PaymentStatus.APPROVED:
        return OrderStatus.PENDING;
      case PaymentStatus.REJECTED:
      case PaymentStatus.CANCELLED:
        return OrderStatus.CANCELLED;
      default:
        return OrderStatus.PENDING_PAYMENT;
    }
  }
}
