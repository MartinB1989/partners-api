import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailOptions } from './ses.interface';

@Injectable()
export class SesService {
  private readonly sesClient: SESClient;
  private readonly logger = new Logger(SesService.name);
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId:
          this.configService.getOrThrow<string>('AWS_SES_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SES_SECRET_ACCESS_KEY',
        ),
      },
    });

    this.defaultFrom = this.configService.getOrThrow<string>(
      'AWS_SES_DEFAULT_FROM',
    );
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: options.from || this.defaultFrom,
        Destination: {
          ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
          CcAddresses: options.cc
            ? Array.isArray(options.cc)
              ? options.cc
              : [options.cc]
            : undefined,
          BccAddresses: options.bcc
            ? Array.isArray(options.bcc)
              ? options.bcc
              : [options.bcc]
            : undefined,
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(options.html && {
              Html: {
                Data: options.html,
                Charset: 'UTF-8',
              },
            }),
            ...(options.text && {
              Text: {
                Data: options.text,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(options.replyTo && {
          ReplyToAddresses: Array.isArray(options.replyTo)
            ? options.replyTo
            : [options.replyTo],
        }),
      });

      await this.sesClient.send(command);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      this.logger.log(`Email enviado exitosamente a ${options.to}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`Error al enviar email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
