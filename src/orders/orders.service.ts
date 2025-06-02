import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto';
import { Order, OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, address, total, ...orderData } = createOrderDto;

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

        // Crear la orden
        const newOrder = await tx.order.create({
          data: {
            ...orderData,
            addressId,
            total,
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

        return newOrder;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Error al crear la orden');
      }
      throw error;
    }
  }

  async findById(id: number): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    return order;
  }
}
