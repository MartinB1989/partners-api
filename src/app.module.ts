import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsModule } from './products/products.module';
import { AwsModule } from './aws/aws.module';
import { CategoriesModule } from './categories/categories.module';
import { CartsModule } from './carts/carts.module';
import { PickupAddressesModule } from './pickup-addresses/pickup-addresses.module';
import { OrdersModule } from './orders/orders.module';
import { EmailModule } from './email/email.module';
import { PaymentsModule } from './payments/payments.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ScheduleModule.forRoot(), // ← Habilita cron jobs y tareas programadas
    ConfigModule.forRoot({
      isGlobal: true, // Hace que el ConfigModule esté disponible en toda la aplicación
      envFilePath: '.env', // Ruta al archivo .env
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 peticiones por segundo (aumentado de 3 para evitar problemas con refresh token)
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 30, // 30 peticiones por 10 segundos (aumentado de 20)
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 150, // 150 peticiones por minuto (aumentado de 100)
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    AwsModule,
    CategoriesModule,
    CartsModule,
    PickupAddressesModule,
    OrdersModule,
    EmailModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Rate limiting global
    },
  ],
})
export class AppModule {}
