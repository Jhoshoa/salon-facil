import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;
  private fromAddress = 'noreply@salonfacil.bo';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromAddress = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (apiKey) {
      this.client = new Resend(apiKey);
      if (fromAddress) this.fromAddress = fromAddress;
      this.logger.log('Resend configurado correctamente');
    } else {
      this.logger.warn('RESEND_API_KEY no configurado — los emails no se enviaran');
    }
  }

  async send(to: string, subject: string, text: string): Promise<SendResult> {
    if (!this.client) {
      return { success: false, error: 'Resend no esta configurado (falta RESEND_API_KEY)' };
    }

    try {
      const result = await this.client.emails.send({
        from: this.fromAddress,
        to,
        subject,
        text,
      });
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
