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

  async findOne(id: number) {
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

  async update(id: number, updateProductDto: UpdateProductDto, userId: string) {
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

  async remove(id: number, userId: string) {
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
    productId: number,
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
        'No tienes permiso para añadir imágenes a este producto',
      );
    }

    // Verificar si ya existe una imagen marcada como principal
    const existingMainImage = await this.prisma.productImage.findFirst({
      where: {
        productId,
        main: true,
      },
    });

    // Si no hay imagen principal, marcar esta como principal
    const isMain = !existingMainImage;

    // Crear la imagen
    const image = await this.prisma.productImage.create({
      data: {
        ...imageDto,
        main: isMain,
        product: {
          connect: { id: productId },
        },
      },
    });

    return image;
  }

  async removeProductImage(productId: number, imageId: string, userId: string) {
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
        'No tienes permiso para eliminar imágenes de este producto',
      );
    }

    // Verificar si la imagen existe
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    // Verificar si la imagen pertenece al producto
    if (image.productId !== productId) {
      throw new BadRequestException(
        'La imagen no pertenece al producto especificado',
      );
    }

    // Eliminar la imagen de la base de datos
    await this.prisma.productImage.delete({ where: { id: imageId } });

    // Si la imagen era principal, asignar otra imagen como principal
    if (image.main) {
      const nextImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { order: 'asc' },
      });

      if (nextImage) {
        await this.prisma.productImage.update({
          where: { id: nextImage.id },
          data: { main: true },
        });
      }
    }

    // Intentar eliminar la imagen de S3
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.awsService['bucket'],
        Key: image.key,
      });
      await this.awsService['s3Client'].send(command);
    } catch (error) {
      console.error(`Error al eliminar imagen ${image.key} de S3:`, error);
    }

    return { success: true, message: 'Imagen eliminada correctamente' };
  }

  async setMainImage(productId: number, imageId: string, userId: string) {
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
        'No tienes permiso para modificar imágenes de este producto',
      );
    }

    // Verificar si la imagen existe
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    // Verificar si la imagen pertenece al producto
    if (image.productId !== productId) {
      throw new BadRequestException(
        'La imagen no pertenece al producto especificado',
      );
    }

    // Actualizar todas las imágenes del producto para quitar la marca de principal
    await this.prisma.productImage.updateMany({
      where: { productId },
      data: { main: false },
    });

    // Marcar la imagen seleccionada como principal
    await this.prisma.productImage.update({
      where: { id: imageId },
      data: { main: true },
    });

    return { success: true, message: 'Imagen principal actualizada' };
  }

  /**
   * Genera una URL prefirmada para eliminar una imagen de S3
   * @param productId ID del producto
   * @param imageId ID de la imagen
   * @param userId ID del usuario
   * @returns URL prefirmada para eliminar la imagen
   */
  async generateDeletePresignedUrl(
    productId: number,
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
        'No tienes permiso para acceder a este producto',
      );
    }

    // Verificar si la imagen existe
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    // Verificar si la imagen pertenece al producto
    if (image.productId !== productId) {
      throw new BadRequestException(
        'La imagen no pertenece al producto especificado',
      );
    }

    // Generar URL prefirmada para eliminar
    const deleteUrl = await this.awsService.getPresignedUrlForDelete(image.key);

    return { deleteUrl, key: image.key };
  }
}
