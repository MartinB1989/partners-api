import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailtrapClient } from 'mailtrap';

export interface SendEmailOptions {
  to: Array<{ email: string; name?: string }>;
  from?: { name: string; email: string };
  template_uuid: string;
  template_variables?: Record<string, any>;
  attachments?: any[];
}

export interface BatchEmailRequest {
  base: {
    from: { name: string; email: string };
    template_uuid: string;
  };
  requests: Array<{
    to: Array<{ email: string; name?: string }>;
    template_variables?: Record<string, any>;
  }>;
}

@Injectable()
export class MailtrapService {
  private readonly logger = new Logger(MailtrapService.name);
  private mailtrapClient: MailtrapClient;
  private senderEmail: string;
  private senderName: string = 'TiendaFacil';

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>('MAILTRAP_TOKEN');
    const senderEmail = this.configService.get<string>('MAILTRAP_SENDER_EMAIL');

    if (!token || !senderEmail) {
      this.logger.error(
        'Missing Mailtrap configuration (token or sender email)',
      );
      throw new Error('Missing Mailtrap configuration (token or sender email)');
    }

    this.senderEmail = senderEmail;
    this.mailtrapClient = new MailtrapClient({ token });
  }

  /**
   * Envía un email individual usando un template de Mailtrap
   */
  async sendTemplateEmail(options: SendEmailOptions): Promise<any> {
    try {
      const emailOptions = {
        from: options.from || {
          name: this.senderName,
          email: this.senderEmail,
        },
        to: options.to,
        template_uuid: options.template_uuid,
        template_variables: options.template_variables || {},
        attachments: options.attachments || [],
      };

      const response = await this.mailtrapClient.send(emailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to.map((r) => r.email).join(', ')}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Error sending email via Mailtrap: ${error}`);
      throw error;
    }
  }

  /**
   * Envía emails en lotes usando batchSend de Mailtrap
   * Recomendado para envío masivo (máximo 20 emails por lote)
   */
  async sendBatch(batchRequest: BatchEmailRequest): Promise<any> {
    try {
      const response = await this.mailtrapClient.batchSend(batchRequest);
      this.logger.log(`Batch email sent successfully`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending batch emails: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene el email del remitente configurado
   */
  getSenderEmail(): string {
    return this.senderEmail;
  }

  /**
   * Obtiene el nombre del remitente configurado
   */
  getSenderName(): string {
    return this.senderName;
  }
}
