import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago/mercadopago.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [
    PaymentsService,
    MercadoPagoService,
    WebhooksService,
    PrismaService,
  ],
  exports: [PaymentsService, MercadoPagoService],
})
export class PaymentsModule {}
