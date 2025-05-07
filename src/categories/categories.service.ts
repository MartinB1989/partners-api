import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '../../generated/prisma';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
      },
    });
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Verificamos si la categoría existe
    const categoryExists = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    // Actualizamos la categoría
    return this.prisma.category.update({
      where: { id },
      data: {
        name: updateCategoryDto.name,
      },
    });
  }

  async remove(id: number): Promise<Category> {
    // Primero verificamos si la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    // Si existe, la eliminamos
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
