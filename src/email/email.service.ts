import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MailtrapService, SendEmailOptions } from './mailtrap.service';
import {
  EMAIL_TEMPLATES,
  EMAIL_BATCH_CONFIG,
} from './constants/email.constants';

interface SendEmailRequest {
  to: Array<{ email: string; name?: string }>;
  templateKey: keyof typeof EMAIL_TEMPLATES;
  templateVariables?: Record<string, any>;
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private mailtrapService: MailtrapService) {}

  /**
   * Envía un email usando un template predefinido
   */
  async sendTemplateEmail(request: SendEmailRequest): Promise<void> {
    try {
      const template = EMAIL_TEMPLATES[request.templateKey];

      if (!template) {
        throw new BadRequestException(
          `Template not found: ${String(request.templateKey)}`,
        );
      }

      if (!template.uuid) {
        throw new BadRequestException(
          `Template UUID not configured for: ${String(request.templateKey)}. Please configure the template in email.constants.ts`,
        );
      }

      const options: SendEmailOptions = {
        to: request.to,
        template_uuid: template.uuid,
        template_variables: request.templateVariables || {},
        attachments: request.attachments || [],
      };

      await this.mailtrapService.sendTemplateEmail(options);
    } catch (error) {
      this.logger.error(
        `Error sending email: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Envía email de confirmación de compra
   */
  async sendOrderConfirmationEmail(
    email: string,
    templateVariables: Record<string, any>,
  ): Promise<void> {
    await this.sendTemplateEmail({
      to: [{ email }],
      templateKey: 'ORDER_CONFIRMATION',
      templateVariables,
    });
  }

  /**
   * Envía email de actualización de estado de orden
   */
  async sendOrderStatusUpdateEmail(
    email: string,
    templateVariables: Record<string, any>,
  ): Promise<void> {
    await this.sendTemplateEmail({
      to: [{ email }],
      templateKey: 'ORDER_STATUS_UPDATE',
      templateVariables,
    });
  }

  /**
   * Envía emails en lotes
   * Implementa el patrón de Mailtrap batchSend para mejor performance
   */
  async sendBatchEmails(
    batchEmails: Array<{
      email: string;
      name?: string;
      templateVariables: Record<string, any>;
    }>,
    templateKey: keyof typeof EMAIL_TEMPLATES,
  ): Promise<{ sent: number; failed: number }> {
    try {
      if (batchEmails.length === 0) {
        return { sent: 0, failed: 0 };
      }

      const template = EMAIL_TEMPLATES[templateKey];

      if (!template || !template.uuid) {
        throw new BadRequestException(
          `Template not configured for: ${String(templateKey)}`,
        );
      }

      let totalSent = 0;
      let totalFailed = 0;

      // Procesar en lotes
      for (
        let i = 0;
        i < batchEmails.length;
        i += EMAIL_BATCH_CONFIG.BATCH_SIZE
      ) {
        const batch = batchEmails.slice(i, i + EMAIL_BATCH_CONFIG.BATCH_SIZE);

        try {
          const batchRequest = {
            base: {
              from: {
                name: this.mailtrapService.getSenderName(),
                email: this.mailtrapService.getSenderEmail(),
              },
              template_uuid: template.uuid,
            },
            requests: batch.map((item) => ({
              to: [{ email: item.email, name: item.name }],
              template_variables: item.templateVariables,
            })),
          };

          const response = (await this.mailtrapService.sendBatch(
            batchRequest,
          )) as {
            success?: boolean;
            responses?: Array<{ success?: boolean }>;
          };

          // Procesar respuestas individuales
          if (response?.success && Array.isArray(response.responses)) {
            response.responses.forEach(
              (batchResponse: { success?: boolean }) => {
                if (batchResponse.success) {
                  totalSent++;
                } else {
                  totalFailed++;
                }
              },
            );
          } else {
            totalFailed += batch.length;
          }

          // Pausa entre lotes
          if (i + EMAIL_BATCH_CONFIG.BATCH_SIZE < batchEmails.length) {
            await new Promise((resolve) =>
              setTimeout(resolve, EMAIL_BATCH_CONFIG.BATCH_DELAY_MS),
            );
          }
        } catch (batchError) {
          this.logger.error(
            `Error sending batch ${Math.floor(i / EMAIL_BATCH_CONFIG.BATCH_SIZE) + 1}: ${batchError instanceof Error ? batchError.message : String(batchError)}`,
          );
          totalFailed += batch.length;
        }
      }

      return { sent: totalSent, failed: totalFailed };
    } catch (error) {
      this.logger.error(
        `Error in batch email sending: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { sent: 0, failed: batchEmails.length };
    }
  }
}
