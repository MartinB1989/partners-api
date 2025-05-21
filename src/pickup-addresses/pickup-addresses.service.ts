import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickupAddressDto, UpdatePickupAddressDto } from './dto';

/**
 * Servicio para la gestión de direcciones de retiro de productos
 * Permite a los usuarios productores configurar múltiples ubicaciones donde los
 * compradores pueden retirar sus productos
 */
@Injectable()
export class PickupAddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreatePickupAddressDto) {
    return this.prisma.pickupAddress.create({
      data: {
        ...createDto,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.pickupAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: string) {
    const pickupAddress = await this.prisma.pickupAddress.findFirst({
      where: { id, userId },
    });

    if (!pickupAddress) {
      throw new NotFoundException('Dirección de retiro no encontrada');
    }

    return pickupAddress;
  }

  async update(id: number, userId: string, updateDto: UpdatePickupAddressDto) {
    // Verificar si la dirección existe y pertenece al usuario
    await this.findOne(id, userId);

    return this.prisma.pickupAddress.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, userId: string) {
    // Verificar si la dirección existe y pertenece al usuario
    await this.findOne(id, userId);

    return this.prisma.pickupAddress.delete({
      where: { id },
    });
  }
}
