// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSellerSettingsDto } from './dto/update-seller-settings.dto';
import * as bcrypt from 'bcrypt';
import { Role, User, SellerSettings } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Verificar si el correo ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Crear usuario con roles por defecto si no se especifican
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roles: createUserDto.roles || [Role.CUSTOM],
      },
    });

    // Eliminar la contraseña antes de devolver el usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return users.map(({ password, ...rest }) => rest);
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Si se actualiza la contraseña, hay que hashearla
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  // Métodos para configuración de vendedor
  async getSellerSettings(userId: string): Promise<SellerSettings> {
    // Verificar que el usuario existe y es vendedor
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      !user.roles.includes(Role.ADMIN) &&
      !user.roles.includes(Role.PRODUCTOR)
    ) {
      throw new ForbiddenException(
        'Solo vendedores (ADMIN o PRODUCTOR) pueden tener configuración de vendedor',
      );
    }

    // Buscar configuración existente o crear una por defecto
    let settings = await this.prisma.sellerSettings.findUnique({
      where: { userId },
    });

    // Si no existe, crear configuración por defecto
    if (!settings) {
      settings = await this.prisma.sellerSettings.create({
        data: {
          userId,
          acceptsHomeDelivery: false,
          acceptsPickup: false,
        },
      });
    }

    return settings;
  }

  async updateSellerSettings(
    userId: string,
    updateDto: UpdateSellerSettingsDto,
  ): Promise<SellerSettings> {
    // Verificar que el usuario existe y es vendedor
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      !user.roles.includes(Role.ADMIN) &&
      !user.roles.includes(Role.PRODUCTOR)
    ) {
      throw new ForbiddenException(
        'Solo vendedores (ADMIN o PRODUCTOR) pueden actualizar configuración de vendedor',
      );
    }

    // Validar que si quiere aceptar retiros en persona, tenga al menos una dirección de retiro activa
    if (updateDto.acceptsPickup === true) {
      const activePickupAddressCount = await this.prisma.pickupAddress.count({
        where: {
          userId,
          isActive: true,
        },
      });

      if (activePickupAddressCount === 0) {
        throw new ConflictException(
          'Para aceptar retiros en persona debes tener al menos una dirección de retiro activa',
        );
      }
    }

    // Buscar configuración existente
    const existingSettings = await this.prisma.sellerSettings.findUnique({
      where: { userId },
    });

    // Si existe, actualizar
    if (existingSettings) {
      return await this.prisma.sellerSettings.update({
        where: { userId },
        data: updateDto,
      });
    }

    // Si no existe, crear con los valores proporcionados
    return await this.prisma.sellerSettings.create({
      data: {
        userId,
        acceptsHomeDelivery: updateDto.acceptsHomeDelivery ?? false,
        acceptsPickup: updateDto.acceptsPickup ?? false,
      },
    });
  }
}
