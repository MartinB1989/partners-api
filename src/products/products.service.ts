import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { AwsService } from '../aws/aws.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly awsService: AwsService,
  ) {}

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
    // Si limit es 0, traer todos los productos sin paginación
    if (limit === 0) {
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            userId,
          },
          orderBy: {
            createdAt: 'desc',
          },
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
          page: 1,
          lastPage: 1,
        },
      };
    }

    // Comportamiento normal con paginación
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
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
      include: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    if (product.userId !== userId) {
      throw new BadRequestException(
        'No tienes permiso para eliminar este producto',
      );
    }

    // Implementar transacción para eliminar el producto y sus imágenes
    return this.prisma.$transaction(async (tx) => {
      // Eliminar las imágenes de la base de datos
      await tx.productImage.deleteMany({ where: { productId: id } });

      // Eliminar el producto
      const deletedProduct = await tx.product.delete({ where: { id } });

      // Luego de la transacción, intentar eliminar de S3 (esto es externo a la DB)
      if (product.images.length > 0) {
        for (const image of product.images) {
          try {
            const command = new DeleteObjectCommand({
              Bucket: this.awsService['bucket'],
              Key: image.key,
            });
            await this.awsService['s3Client'].send(command);
          } catch (error) {
            console.error(
              `Error al eliminar imagen ${image.key} de S3:`,
              error,
            );
          }
        }
      }

      return deletedProduct;
    });
  }

  /**
   * Genera una URL prefirmada para subir una imagen a S3
   */
  async generatePresignedUrl(generatePresignedUrlDto: GeneratePresignedUrlDto) {
    const { contentType, fileExtension } = generatePresignedUrlDto;

    return this.awsService.getPresignedUrlForUpload(fileExtension, contentType);
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

    // Implementar transacción
    if (imageDto.main) {
      return this.prisma.$transaction([
        // Desmarcar imágenes principales existentes
        this.prisma.productImage.updateMany({
          where: { productId, main: true },
          data: { main: false },
        }),

        // Crear la nueva imagen como principal
        this.prisma.productImage.create({
          data: {
            ...imageDto,
            product: { connect: { id: productId } },
          },
        }),
      ]);
    } else {
      // Si no es principal, solo crear la imagen
      return this.prisma.productImage.create({
        data: {
          ...imageDto,
          product: { connect: { id: productId } },
        },
      });
    }
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

    return this.prisma.$transaction(async (tx) => {
      // Obtener si la imagen es principal
      const image = await tx.productImage.findUnique({
        where: { id: imageId },
      });

      if (!image) {
        throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
      }

      // Eliminar la imagen
      await tx.productImage.delete({ where: { id: imageId } });

      // Si era la imagen principal, establecer otra imagen como principal
      if (image.main) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId },
          orderBy: { order: 'asc' },
        });

        if (nextImage) {
          await tx.productImage.update({
            where: { id: nextImage.id },
            data: { main: true },
          });
        }
      }

      return { success: true };
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

    // Implementar transacción aquí
    return this.prisma.$transaction([
      // Desmarcar todas las imágenes principales
      this.prisma.productImage.updateMany({
        where: { productId, main: true },
        data: { main: false },
      }),

      // Marcar la nueva imagen como principal
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { main: true },
      }),
    ]);
  }

  /**
   * Genera una URL prefirmada para eliminar una imagen de S3
   * @param productId ID del producto
   * @param imageId ID de la imagen
   * @param userId ID del usuario
   * @returns URL prefirmada para eliminar la imagen
   */
  async generateDeletePresignedUrl(
    productId: string,
    imageId: string,
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

    // Verificar si la imagen existe
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    // Cuando tengas la migración con el campo 'key', puedes descomentar esta línea:
    return this.awsService.getPresignedUrlForDelete(image.key);

    // Por ahora devolvemos un objeto vacío
    // return {
    //   success: true,
    //   message: 'URL generada correctamente (simulación)',
    // };
  }
}
