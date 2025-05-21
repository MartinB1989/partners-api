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
        total: 0, // Inicializar el total en 0
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

  // Método privado para calcular y actualizar el total del carrito
  private async updateCartTotal(cartId: string): Promise<void> {
    // Obtener todos los items del carrito con sus subtotales
    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId },
    });

    // Calcular el total sumando los subtotales
    const total = cartItems.reduce((sum, item) => sum + item.subTotal, 0);

    // Actualizar el total del carrito
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { total },
    });
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

    // Calcular el subtotal
    const subTotal = product.price * addItemDto.quantity;

    // Verificar si el producto ya está en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId: addItemDto.productId,
        },
      },
    });

    let updatedItem;

    if (existingItem) {
      // Actualizar la cantidad y el subtotal
      const newQuantity = existingItem.quantity + addItemDto.quantity;
      const newSubTotal = product.price * newQuantity;

      updatedItem = await this.prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: newQuantity,
          subTotal: newSubTotal,
        },
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      });
    } else {
      // Crear nuevo item en el carrito con el subtotal
      updatedItem = await this.prisma.cartItem.create({
        data: {
          cart: {
            connect: { id: cartId },
          },
          product: {
            connect: { id: addItemDto.productId },
          },
          quantity: addItemDto.quantity,
          subTotal,
        },
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      });
    }

    // Actualizar el total del carrito
    await this.updateCartTotal(cartId);

    return updatedItem as unknown as CartItemWithProduct;
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

    // Calcular el nuevo subtotal
    const subTotal = product.price * updateItemQuantityDto.quantity;

    const updatedItem = await this.prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },
      data: {
        quantity: updateItemQuantityDto.quantity,
        subTotal,
      },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
    });

    // Actualizar el total del carrito
    await this.updateCartTotal(cartId);

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

    // Eliminar el item
    await this.prisma.cartItem.delete({
      where: {
        id: existingItem.id,
      },
    });

    // Actualizar el total del carrito
    await this.updateCartTotal(cartId);

    // Obtener el carrito actualizado para devolver
    const updatedCart = await this.prisma.cart.findUnique({
      where: { id: cartId },
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

    return updatedCart;
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
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException(`Carrito con ID ${id} no encontrado`);
    }

    // Eliminar todos los items
    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: id,
      },
    });

    // Actualizar el total del carrito a 0
    await this.prisma.cart.update({
      where: { id },
      data: { total: 0 },
    });

    // Obtener el carrito actualizado para devolver
    const updatedCart = await this.prisma.cart.findUnique({
      where: { id },
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

  // Transferir un carrito anónimo a un usuario registrado
  async transferCartToUser(
    sessionId: string,
    userId: string,
  ): Promise<CartWithRelations> {
    // Buscar el carrito anónimo
    const anonymousCart = await this.prisma.cart.findFirst({
      where: {
        sessionId,
      },
      include: {
        items: true,
      },
    });

    if (!anonymousCart) {
      throw new NotFoundException(
        `Carrito con sessionId ${sessionId} no encontrado`,
      );
    }

    // Buscar si el usuario ya tiene un carrito
    const userCart = await this.prisma.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: true,
      },
    });

    // Si el usuario no tiene carrito, asignarle el anónimo
    if (!userCart) {
      const updatedCart = await this.prisma.cart.update({
        where: {
          id: anonymousCart.id,
        },
        data: {
          userId,
          sessionId: null,
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

    // Si el usuario ya tiene carrito, transferir los items del carrito anónimo al carrito del usuario
    for (const item of anonymousCart.items) {
      // Verificar si el item ya existe en el carrito del usuario
      const existingItem = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: userCart.id,
            productId: item.productId,
          },
        },
      });

      // Obtener el producto para calcular el subtotal
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        continue; // Saltar si el producto no existe
      }

      if (existingItem) {
        // Actualizar la cantidad y el subtotal del item existente
        const newQuantity = existingItem.quantity + item.quantity;
        const newSubTotal = product.price * newQuantity;

        await this.prisma.cartItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: newQuantity,
            subTotal: newSubTotal,
          },
        });
      } else {
        // Crear un nuevo item en el carrito del usuario
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            quantity: item.quantity,
            subTotal: item.subTotal,
          },
        });
      }
    }

    // Actualizar el total del carrito del usuario
    await this.updateCartTotal(userCart.id);

    // Eliminar el carrito anónimo
    await this.prisma.cart.delete({
      where: {
        id: anonymousCart.id,
      },
    });

    // Devolver el carrito actualizado del usuario
    const updatedUserCart = await this.prisma.cart.findUnique({
      where: {
        id: userCart.id,
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
