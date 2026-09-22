import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export interface SendResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private client: SESv2Client | null = null;
  private fromAddress = 'noreply@mievento.com.bo';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const fromAddress = this.configService.get<string>('SES_FROM_EMAIL');

    if (region && accessKeyId && secretAccessKey) {
      this.client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
      if (fromAddress) this.fromAddress = fromAddress;
      this.logger.log('AWS SES configurado correctamente');
    } else {
      this.logger.warn(
        'AWS SES no configurado (faltan AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) — los emails no se enviaran',
      );
    }
  }

  /** `html` is optional so callers without a matching template (or a future notification type
   * that hasn't been designed yet) still send a plain-text email instead of nothing. When
   * present, SES sends a proper multipart message — `text` remains the fallback body for
   * clients that don't render HTML. */
  async send(to: string, subject: string, text: string, html?: string): Promise<SendResult> {
    if (!this.client) {
      return { success: false, error: 'AWS SES no esta configurado' };
    }

    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.fromAddress,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: {
                Text: { Data: text, Charset: 'UTF-8' },
                ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
              },
            },
          },
        }),
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
