import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendTestEmailDto } from './dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Endpoint de prueba para enviar email de confirmación de compra
   * Solo requiere el email destino
   */
  @Post('test/send-order-confirmation')
  async sendTestOrderConfirmation(
    @Body() sendTestEmailDto: SendTestEmailDto,
  ): Promise<{ message: string; email: string }> {
    const templateVariables = sendTestEmailDto.templateVariables || {
      orderNumber: '#ORD-2024-001',
      customerName: 'Cliente',
      total: 0,
      itemsCount: 0,
    };

    await this.emailService.sendOrderConfirmationEmail(
      sendTestEmailDto.to,
      templateVariables,
    );

    return {
      message: 'Email de confirmación de compra enviado exitosamente',
      email: sendTestEmailDto.to,
    };
  }
}
