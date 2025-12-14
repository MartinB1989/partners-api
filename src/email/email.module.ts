import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { MailtrapService } from './mailtrap.service';
import { EmailController } from './email.controller';
import { SendOrderConfirmationEmailUseCase } from './use-cases/send-order-confirmation-email.use-case';
import { SendOrderStatusUpdateEmailUseCase } from './use-cases/send-order-status-update-email.use-case';

@Module({
  imports: [ConfigModule],
  providers: [
    MailtrapService,
    EmailService,
    SendOrderConfirmationEmailUseCase,
    SendOrderStatusUpdateEmailUseCase,
  ],
  controllers: [EmailController],
  exports: [
    EmailService,
    SendOrderConfirmationEmailUseCase,
    SendOrderStatusUpdateEmailUseCase,
  ],
})
export class EmailModule {}
