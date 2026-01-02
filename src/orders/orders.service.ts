import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto';
import {
  Order,
  OrderStatus,
  Prisma,
  PaymentMethod,
  PaymentStatus,
  Role,
  User,
} from '@prisma/client';
import { generateOrderNumber } from './utils/generate-order-number';
import { SendOrderStatusUpdateEmailUseCase } from '../email/use-cases/send-order-status-update-email.use-case';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private sendOrderStatusUpdateEmailUseCase: SendOrderStatusUpdateEmailUseCase,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, address, total, deliveryPrice, ...orderData } =
      createOrderDto;

    // Obtener los productos y validar existencia, stock y vendedor único
    const products = await Promise.all(
      items.map((item) =>
        this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, userId: true, stock: true, title: true },
        }),
      ),
    );

    // Verificar que todos los productos existan
    for (let i = 0; i < items.length; i++) {
      const product = products[i];
      const item = items[i];

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

    // Validar que todos los productos sean del mismo vendedor
    const vendorIds = [...new Set(products.map((p) => p!.userId))];

    if (vendorIds.length > 1) {
      throw new BadRequestException(
        'No se pueden procesar órdenes con productos de múltiples vendedores',
      );
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

  async findAll(page = 1, limit = 10, user: User) {
    const skip = (page - 1) * limit;

    // Determinar el filtro según el rol del usuario
    const whereClause: Prisma.OrderWhereInput = {};

    if (
      user.roles.includes(Role.PRODUCTOR) &&
      !user.roles.includes(Role.ADMIN)
    ) {
      // Si es PRODUCTOR (y no ADMIN), filtrar por órdenes con sus productos
      whereClause.items = {
        some: {
          product: {
            userId: user.id,
          },
        },
      };
    }
    // Si es ADMIN, no se agrega filtro (verá todas las órdenes)

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: whereClause,
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
      this.prisma.order.count({ where: whereClause }),
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
    user: User,
  ): Promise<{ status: OrderStatus }> {
    // Verificar que la orden exista e incluir items con producto
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // Verificar autorización: Solo ADMIN o PRODUCTOR dueño de los productos
    const isAdmin = user.roles.includes(Role.ADMIN);
    const isProductor = user.roles.includes(Role.PRODUCTOR);

    if (!isAdmin && isProductor) {
      // Verificar que todos los productos de la orden pertenezcan al productor
      const allProductsBelongToProducer = order.items.every(
        (item) => item.product.userId === user.id,
      );

      if (!allProductsBelongToProducer) {
        throw new ForbiddenException(
          'No tienes permiso para actualizar esta orden. Solo puedes actualizar órdenes que contengan tus productos.',
        );
      }
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
    });

    // Enviar email de notificación de cambio de estado (non-blocking)
    this.sendOrderStatusUpdateEmailUseCase
      .execute(updatedOrder)
      .catch((error) => {
        this.logger.error(
          `Failed to send status update email for order ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
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
