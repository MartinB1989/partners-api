import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        user: {
          connect: { id: userId },
        },
      },
      include: {
        images: true,
      },
    });

    return product;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        include: {
          images: {
            orderBy: {
              order: 'asc',
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.product.count(),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findAllByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          userId,
        },
        skip,
        take: limit,
        include: {
          images: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      }),
      this.prisma.product.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: {
            order: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, userId: string) {
    // Verificar si el producto existe y pertenece al usuario
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para actualizar este producto',
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        images: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verificar si el producto existe y pertenece al usuario
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para eliminar este producto',
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // Métodos para manejar imágenes
  async addProductImage(
    productId: string,
    imageDto: CreateProductImageDto,
    userId: string,
  ) {
    // Verificar si el producto existe y pertenece al usuario
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para modificar este producto',
      );
    }

    // Si la imagen es principal, desmarcamos las otras imágenes principales
    if (imageDto.main) {
      await this.prisma.productImage.updateMany({
        where: {
          productId,
          main: true,
        },
        data: {
          main: false,
        },
      });
    }

    return this.prisma.productImage.create({
      data: {
        ...imageDto,
        product: {
          connect: { id: productId },
        },
      },
    });
  }

  async removeProductImage(productId: string, imageId: string, userId: string) {
    // Verificar si el producto existe y pertenece al usuario
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para modificar este producto',
      );
    }

    // Verificar si la imagen existe
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    return this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  async setMainImage(productId: string, imageId: string, userId: string) {
    // Verificar si el producto existe y pertenece al usuario
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para modificar este producto',
      );
    }

    // Verificar si la imagen existe y pertenece al producto
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new NotFoundException(
        `Imagen con ID ${imageId} no encontrada para este producto`,
      );
    }

    // Actualizar todas las imágenes del producto para quitar el main
    await this.prisma.productImage.updateMany({
      where: {
        productId,
        main: true,
      },
      data: {
        main: false,
      },
    });

    // Establecer esta imagen como la principal
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        main: true,
      },
    });
  }
}
