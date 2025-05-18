import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Prisma } from '@prisma/client';
import { FilterCategoryDto } from './dto/filter-category.dto';

interface UpdateCategoryData extends Partial<UpdateCategoryDto> {
  idName?: string;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private generateIdName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async validateCategoryHierarchy(level: number, parentId?: number) {
    if (level === 1 && parentId) {
      throw new BadRequestException(
        'Las categorías de nivel 1 no pueden tener padre',
      );
    }

    if (level > 1 && !parentId) {
      throw new BadRequestException(
        'Las categorías de nivel 2 y 3 deben tener un padre',
      );
    }

    if (parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Categoría padre con ID ${parentId} no encontrada`,
        );
      }

      if (parent.level >= level) {
        throw new BadRequestException(
          'El nivel de la categoría debe ser mayor que el nivel de su padre',
        );
      }
    }
  }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findByFilters(filters: FilterCategoryDto): Promise<Category[]> {
    const where: Prisma.CategoryWhereInput = {};

    if (filters.level) {
      where.level = filters.level;
    }

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters.idName) {
      where.idName = {
        contains: filters.idName,
        mode: 'insensitive',
      };
    }

    return this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async getFullHierarchy(): Promise<CategoryWithChildren[]> {
    // Obtener todas las categorías
    const allCategories = await this.prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // Organizar en un mapa para facilitar el acceso
    const categoriesMap = new Map<number, CategoryWithChildren>();
    allCategories.forEach((category) => {
      categoriesMap.set(category.id, { ...category, children: [] });
    });

    // Construir la jerarquía
    const rootCategories: CategoryWithChildren[] = [];

    // Iterar sobre todas las categorías y organizarlas
    allCategories.forEach((category) => {
      const categoryWithChildren = categoriesMap.get(category.id);

      if (categoryWithChildren) {
        if (category.level === 1) {
          // Es una categoría de nivel 1 (raíz)
          rootCategories.push(categoryWithChildren);
        } else if (category.parentId) {
          // Es una categoría de nivel 2 o 3, agregarla como hijo de su padre
          const parent = categoriesMap.get(category.parentId);
          if (parent && parent.children) {
            parent.children.push(categoryWithChildren);
          }
        }
      }
    });

    return rootCategories;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    await this.validateCategoryHierarchy(
      createCategoryDto.level,
      createCategoryDto.parentId,
    );

    const idName = this.generateIdName(createCategoryDto.name);

    // Verificar si el idName ya existe
    const existingCategory = await this.prisma.category.findUnique({
      where: { idName },
    });

    if (existingCategory) {
      throw new BadRequestException(
        'Ya existe una categoría con un nombre similar',
      );
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        idName,
        level: createCategoryDto.level,
        parentId: createCategoryDto.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    if (updateCategoryDto.level) {
      await this.validateCategoryHierarchy(
        updateCategoryDto.level,
        updateCategoryDto.parentId,
      );
    }

    const data: UpdateCategoryData = { ...updateCategoryDto };

    if (updateCategoryDto.name) {
      data.idName = this.generateIdName(updateCategoryDto.name);
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: number): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    if (category?.children?.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría que tiene subcategorías',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
