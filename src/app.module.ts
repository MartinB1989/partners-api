import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
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
    ConfigModule.forRoot({
      isGlobal: true, // Hace que el ConfigModule esté disponible en toda la aplicación
      envFilePath: '.env', // Ruta al archivo .env
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 3, // 3 peticiones por segundo
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 20, // 20 peticiones por 10 segundos
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 peticiones por minuto
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
