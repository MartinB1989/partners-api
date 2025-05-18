// src/auth/guards/admin-producer.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class AdminProducerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { email } = request.body as { email: string };

    // Buscar usuario por email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Verificar si el usuario existe
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el usuario tiene el rol de ADMIN o PRODUCTOR
    const hasValidRole = user.roles.some(
      (role) => role === Role.ADMIN || role === Role.PRODUCTOR,
    );

    if (!hasValidRole) {
      throw new UnauthorizedException(
        'No tienes permisos para acceder al panel de administración',
      );
    }

    return true;
  }
}
