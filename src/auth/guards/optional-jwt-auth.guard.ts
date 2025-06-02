import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Sobrescribimos el método canActivate para que siempre devuelva true
  // pero extraiga el usuario si está autenticado
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    try {
      // Intenta autenticar como lo haría normalmente
      return super.canActivate(context);
    } catch (_) {
      // No hacemos nada con el error, simplemente continuamos
      return true;
    }
  }

  // Sobrescribimos el método handleRequest para que no lance excepciones
  handleRequest<TUser = any>(err: any, user: any): TUser {
    return user as TUser;
  }
}
