import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Definir una interfaz para la respuesta de excepción
interface HttpExceptionResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Manejo de errores HTTP
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Obtener el mensaje de error y posibles datos adicionales
    let message = 'Error interno del servidor';
    let errorData: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        // Usar el tipo correcto para evitar el error de linter
        const exceptionResponseObj = exceptionResponse as HttpExceptionResponse;

        if (exceptionResponseObj.message) {
          message = Array.isArray(exceptionResponseObj.message)
            ? exceptionResponseObj.message.join(', ')
            : exceptionResponseObj.message;
        }

        // Extraer el resto de propiedades usando la sintaxis del operador rest
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { message: _unused, ...rest } = exceptionResponseObj;
        errorData = rest as Record<string, unknown>;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Registrar el error (solo mostrar stack trace en errores del servidor)
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${message}`,
      );
    }

    // Formato de respuesta estándar para errores
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: errorData,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
