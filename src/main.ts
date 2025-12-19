import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // Validar variables de entorno críticas al inicio
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'AWS_S3_ACCESS_KEY_ID',
    'AWS_S3_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET',
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_WEBHOOK_SECRET',
    'MAILTRAP_TOKEN',
    'MAILTRAP_SENDER_EMAIL',
  ];

  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Application cannot start without these variables. ` +
        `Please check your .env file and ensure all required variables are set.`,
    );
  }

  const app = await NestFactory.create(AppModule);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  // Habilitar CORS
  app.enableCors({
    origin: 'http://localhost:3000', // URL de tu frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Aplicar el filtro de excepciones global
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  // Aplicar pipes de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en los DTOs
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma automáticamente los payloads a instancias de clase
    }),
  );

  // Establecer prefijo global /api
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
