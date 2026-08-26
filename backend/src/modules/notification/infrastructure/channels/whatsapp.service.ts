import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import type { SendResult } from './email.service';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: Twilio | null = null;
  private fromNumber: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER');

    if (accountSid && authToken && fromNumber) {
      this.client = new Twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.logger.log('Twilio WhatsApp configurado correctamente');
    } else {
      this.logger.warn('Credenciales de Twilio no configuradas — los WhatsApp no se enviaran');
    }
  }

  /** `to` is a plain Bolivian phone number (e.g. "+59171234567"); the "whatsapp:" prefix
   * Twilio requires is added here so callers never need to know about that convention. */
  async send(to: string, message: string): Promise<SendResult> {
    if (!this.client || !this.fromNumber) {
      return { success: false, error: 'Twilio no esta configurado (faltan credenciales)' };
    }

    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${to}`,
        body: message,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
