import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';
import { AwsService } from '../aws/aws.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Role } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly awsService: AwsService,
  ) {}

  /**
   * Verifica si el usuario tiene permisos para modificar un producto
   * Permite acceso a: ADMIN o dueño del producto (PRODUCTOR)
   */
  private async verifyProductOwnership(
    productId: number,
    userId: string,
  ): Promise<void> {
    // Obtener el producto y el usuario
    const [product, user] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { userId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    // Permitir acceso si es ADMIN o si es el dueño del producto
    const isAdmin = user.roles.includes(Role.ADMIN);
    const isOwner = product.userId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción en este producto',
      );
    }
  }

  async create(createProductDto: CreateProductDto, userId: string) {
    const { categoryIds, size, ...productData } = createProductDto;

    // Verificar que las categorías existan
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
      });

      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('Una o más categorías no existen');
      }
    }

    // Crear el producto con sus categorías y dimensiones en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Crear el producto
      const product = await tx.product.create({
        data: {
          ...productData,
          user: {
            connect: { id: userId },
          },
        },
      });

      // Crear las dimensiones del producto
      if (size) {
        await tx.productSize.create({
          data: {
            ...size,
            productId: product.id,
          },
        });
      }

      // Crear las relaciones con las categorías
      if (categoryIds && categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: product.id,
            categoryId,
          })),
        });
      }

      // Obtener el producto con las imágenes, dimensiones y categorías
      const productWithRelations = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          images: true,
          size: true,
          productCategories: {
            include: {
              category: true,
            },
          },
        },
      });

      return productWithRelations;
    });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          active: true,
        },
        skip,
        take: limit,
        include: {
          images: {
            orderBy: {
              order: 'asc',
            },
          },
          size: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          productCategories: {
            include: {
              category: true,
            },
          },
        },
      }),
      this.prisma.product.count({
        where: {
          active: true,
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
            size: true,
            productCategories: {
              include: {
                category: true,
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
          size: true,
          productCategories: {
            include: {
              category: true,
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
        size: true,
        user: {
          select: {
            id: true,
            name: true,
            sellerSettings: {
              select: {
                acceptsHomeDelivery: true,
                acceptsPickup: true,
              },
            },
          },
        },
        productCategories: {
          include: {
            category: {
              include: {
                parent: {
                  include: {
                    parent: true, // Incluye categoría abuelo (nivel 3)
                  },
                },
              },
            },
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
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(id, userId);

    const { categoryIds, size, ...productData } = updateProductDto;

    // Verificar que las categorías existan si se proporcionan
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
      });

      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('Una o más categorías no existen');
      }
    }

    // Actualizar el producto y sus categorías en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Actualizar el producto
      await tx.product.update({
        where: { id },
        data: productData,
      });

      // Actualizar las dimensiones si se proporcionan
      if (size) {
        await tx.productSize.upsert({
          where: { productId: id },
          update: size,
          create: {
            ...size,
            productId: id,
          },
        });
      }

      // Si hay categoryIds, actualizar las relaciones
      if (categoryIds && categoryIds.length > 0) {
        // Eliminar relaciones existentes
        await tx.productCategory.deleteMany({
          where: { productId: id },
        });

        // Crear nuevas relaciones
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          })),
        });
      }

      // Obtener el producto actualizado con sus relaciones
      const productWithRelations = await tx.product.findUnique({
        where: { id },
        include: {
          images: true,
          size: true,
          productCategories: {
            include: {
              category: true,
            },
          },
        },
      });

      return productWithRelations;
    });
  }

  async remove(id: number, userId: string) {
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(id, userId);

    // Obtener el producto con sus imágenes
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // Implementar transacción para eliminar el producto y sus imágenes
    return this.prisma.$transaction(async (tx) => {
      // Eliminar las relaciones con categorías
      await tx.productCategory.deleteMany({ where: { productId: id } });

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
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(productId, userId);

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
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(productId, userId);

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

    // Usar transacción para eliminar la imagen y actualizar la imagen principal si es necesario
    await this.prisma.$transaction(async (tx) => {
      // Eliminar la imagen de la base de datos
      await tx.productImage.delete({ where: { id: imageId } });

      // Si la imagen era principal, asignar otra imagen como principal
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
    });

    // Intentar eliminar la imagen de S3 (operación externa, fuera de la transacción)
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
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(productId, userId);

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

    // Usar transacción para garantizar que ambas operaciones sean atómicas
    await this.prisma.$transaction(async (tx) => {
      // Actualizar todas las imágenes del producto para quitar la marca de principal
      await tx.productImage.updateMany({
        where: { productId },
        data: { main: false },
      });

      // Marcar la imagen seleccionada como principal
      await tx.productImage.update({
        where: { id: imageId },
        data: { main: true },
      });
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
    // Verificar permisos (ADMIN o dueño del producto)
    await this.verifyProductOwnership(productId, userId);

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
