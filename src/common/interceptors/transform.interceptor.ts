import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Si la respuesta ya tiene un formato estandarizado, la devolvemos tal cual
        if (data && data.success !== undefined) {
          return data;
        }

        // Formato estándar para respuestas exitosas
        return {
          success: true,
          data,
          message: 'Operación realizada con éxito',
        };
      }),
    );
  }
}
