import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { MailtrapService } from './mailtrap.service';
import { EmailController } from './email.controller';
import { SendOrderConfirmationEmailUseCase } from './use-cases/send-order-confirmation-email.use-case';

@Module({
  imports: [ConfigModule],
  providers: [MailtrapService, EmailService, SendOrderConfirmationEmailUseCase],
  controllers: [EmailController],
  exports: [EmailService, SendOrderConfirmationEmailUseCase],
})
export class EmailModule {}
