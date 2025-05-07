import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../generated/prisma';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../../../generated/prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero verificamos que el usuario esté autenticado
    const jwtGuard = new JwtAuthGuard();
    const isAuthenticated = await jwtGuard.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Obtenemos los roles requeridos del decorador
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitimos el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtenemos el usuario desde la request
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Verificamos si el usuario existe
    if (!user) {
      throw new UnauthorizedException('No se ha autenticado correctamente');
    }

    // Verificamos si el usuario tiene alguno de los roles requeridos
    const hasRole = user.roles.some((role: Role) =>
      requiredRoles.includes(role),
    );

    if (!hasRole) {
      throw new UnauthorizedException(
        'No tienes los permisos necesarios para realizar esta acción',
      );
    }

    return true;
  }
}
