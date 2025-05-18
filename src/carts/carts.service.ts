import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddItemDto,
  CreateAddressDto,
  CreateCartDto,
  UpdateCartDto,
  UpdateItemQuantityDto,
} from './dto';
import { Address, DeliveryType } from '@prisma/client';
import { CartWithRelations, CartItemWithProduct } from './models/cart.model';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  // Crear un carrito
  async create(createCartDto: CreateCartDto): Promise<CartWithRelations> {
    const cart = await this.prisma.cart.create({
      data: {
        sessionId: createCartDto.sessionId,
        userId: createCartDto.userId,
        addressId: createCartDto.addressId,
        deliveryType: createCartDto.deliveryType || DeliveryType.PICKUP,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        address: true,
      },
    });

    return cart as unknown as CartWithRelations;
  }

  // Encontrar un carrito para un usuario registrado
  async findOneByUserId(userId: string): Promise<CartWithRelations> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!cart) {
      return this.create({ userId });
    }

    return cart as unknown as CartWithRelations;
  }

  // Encontrar un carrito para un usuario anónimo
  async findOneBySessionId(sessionId: string): Promise<CartWithRelations> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        sessionId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!cart) {
      return this.create({ sessionId });
    }

    return cart as unknown as CartWithRelations;
  }

  // Añadir un producto al carrito
  async addItem(
    cartId: string,
    addItemDto: AddItemDto,
  ): Promise<CartItemWithProduct> {
    // Verificar que el carrito existe
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException(`Carrito con ID ${cartId} no encontrado`);
    }

    // Verificar que el producto existe y tiene stock
    const product = await this.prisma.product.findUnique({
      where: { id: addItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto con ID ${addItemDto.productId} no encontrado`,
      );
    }

    if (!product.active) {
      throw new BadRequestException(
        `Producto con ID ${addItemDto.productId} no está activo`,
      );
    }

    if (product.stock < addItemDto.quantity) {
      throw new BadRequestException(
        `Producto con ID ${addItemDto.productId} no tiene suficiente stock (disponible: ${product.stock})`,
      );
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId: addItemDto.productId,
        },
      },
    });

    if (existingItem) {
      // Actualizar la cantidad
      const updatedItem = await this.prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: existingItem.quantity + addItemDto.quantity,
        },
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      });

      return updatedItem as unknown as CartItemWithProduct;
    }

    // Crear nuevo item en el carrito
    const newItem = await this.prisma.cartItem.create({
      data: {
        cart: {
          connect: { id: cartId },
        },
        product: {
          connect: { id: addItemDto.productId },
        },
        quantity: addItemDto.quantity,
      },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
    });

    return newItem as unknown as CartItemWithProduct;
  }

  // Actualizar la cantidad de un producto en el carrito
  async updateItemQuantity(
    cartId: string,
    productId: number,
    updateItemQuantityDto: UpdateItemQuantityDto,
  ): Promise<CartItemWithProduct> {
    // Verificar que el item existe en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException(
        `Producto con ID ${productId} no encontrado en el carrito ${cartId}`,
      );
    }

    // Verificar stock disponible
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (product.stock < updateItemQuantityDto.quantity) {
      throw new BadRequestException(
        `Producto con ID ${productId} no tiene suficiente stock (disponible: ${product.stock})`,
      );
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: updateItemQuantityDto.quantity,
      },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
    });

    return updatedItem as unknown as CartItemWithProduct;
  }

  // Eliminar un producto del carrito
  async removeItem(cartId: string, productId: number) {
    // Verificar que el item existe en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException(
        `Producto con ID ${productId} no encontrado en el carrito ${cartId}`,
      );
    }

    return this.prisma.cartItem.delete({
      where: {
        id: existingItem.id,
      },
    });
  }

  // Actualizar el carrito (dirección, tipo de entrega)
  async update(
    id: string,
    updateCartDto: UpdateCartDto,
  ): Promise<CartWithRelations> {
    // Verificar que el carrito existe
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException(`Carrito con ID ${id} no encontrado`);
    }

    const updatedCart = await this.prisma.cart.update({
      where: { id },
      data: {
        addressId: updateCartDto.addressId,
        deliveryType: updateCartDto.deliveryType,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        address: true,
      },
    });

    return updatedCart as unknown as CartWithRelations;
  }

  // Vaciar el carrito
  async clear(id: string): Promise<CartWithRelations> {
    // Verificar que el carrito existe
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException(`Carrito con ID ${id} no encontrado`);
    }

    // Eliminar todos los items del carrito
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: id,
      },
    });

    const clearedCart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: true,
        address: true,
      },
    });

    return clearedCart as unknown as CartWithRelations;
  }

  // Transferir carrito de sesión a usuario registrado
  async transferCartToUser(
    sessionId: string,
    userId: string,
  ): Promise<CartWithRelations> {
    // Verificar si existe un carrito para la sesión
    const sessionCart = await this.findOneBySessionId(sessionId);

    // Verificar si existe un carrito para el usuario
    const userCart = await this.findOneByUserId(userId);

    // Si el carrito de sesión está vacío, simplemente devolver el carrito del usuario
    if (sessionCart.items.length === 0) {
      return userCart;
    }

    // Transferir los items del carrito de sesión al carrito del usuario
    for (const item of sessionCart.items) {
      try {
        await this.addItem(userCart.id, {
          productId: item.productId,
          quantity: item.quantity,
        });
      } catch (error) {
        // Si hay error, continuar con el siguiente item
        console.error(
          `Error al transferir producto ${item.productId} al carrito del usuario: ${error.message}`,
        );
      }
    }

    // Transferir configuración del carrito
    if (sessionCart.addressId) {
      await this.update(userCart.id, {
        addressId: sessionCart.addressId,
        deliveryType: sessionCart.deliveryType,
      });
    }

    // Limpiar el carrito de sesión
    await this.clear(sessionCart.id);

    // Devolver el carrito actualizado del usuario
    const updatedUserCart = await this.prisma.cart.findUnique({
      where: { id: userCart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        address: true,
      },
    });

    return updatedUserCart as unknown as CartWithRelations;
  }

  // Crear una dirección
  async createAddress(createAddressDto: CreateAddressDto): Promise<Address> {
    return this.prisma.address.create({
      data: {
        street: createAddressDto.street,
        number: createAddressDto.number,
        city: createAddressDto.city,
        state: createAddressDto.state,
        zipCode: createAddressDto.zipCode,
        country: createAddressDto.country || 'España',
        userId: createAddressDto.userId,
      },
    }) as unknown as Address;
  }

  // Obtener direcciones de un usuario
  async findAddressesByUserId(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as unknown as Address[];
  }
}
