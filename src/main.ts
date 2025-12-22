import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

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

  // ============================================================
  // HELMET SECURITY HEADERS
  // ============================================================
  const isProduction = process.env.NODE_ENV === 'production';
  const awsBucket = process.env.AWS_S3_BUCKET;
  const awsRegion = process.env.AWS_REGION;
  const s3Domain = `https://${awsBucket}.s3.${awsRegion}.amazonaws.com`;

  app.use(
    helmet({
      // Content Security Policy - Permite imágenes de S3
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', s3Domain, 'https://*.s3.amazonaws.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", s3Domain],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },

      // Cross-Origin Policies - CRÍTICO para S3
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      // HSTS - Solo en producción
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,

      // Otros headers de seguridad
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  console.log(
    `[SECURITY] Helmet habilitado (entorno: ${process.env.NODE_ENV || 'development'})`,
  );
  console.log(`[SECURITY] HSTS: ${isProduction ? 'activado' : 'desactivado'}`);
  console.log(`[SECURITY] CSP permite imágenes de: ${s3Domain}`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  // Habilitar CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600, // Cache preflight por 1 hora
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
