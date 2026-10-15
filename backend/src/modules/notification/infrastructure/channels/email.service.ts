import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private fromAddress = 'noreply@mievento.com.bo';
  private fromName = 'Mi Evento';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // EMAIL_ENABLED is a deliberate, explicit kill switch -- independent of whether credentials
    // happen to be set -- so sending can be turned off in a given environment without having to
    // unset/rotate the SMTP password.
    const enabled = this.configService.get<string>('EMAIL_ENABLED') === 'true';
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const username = this.configService.get<string>('SMTP_USERNAME');
    const password = this.configService.get<string>('SMTP_PASSWORD');
    const fromAddress = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');

    if (enabled && host && port && username && password) {
      const portNumber = Number(port);
      this.transporter = nodemailer.createTransport({
        host,
        port: portNumber,
        // 465 is implicit TLS; everything else (587, 25) starts plain and upgrades via
        // STARTTLS, which nodemailer negotiates on its own once `secure` is false.
        secure: portNumber === 465,
        auth: { user: username, pass: password },
      });
      if (fromAddress) this.fromAddress = fromAddress;
      if (fromName) this.fromName = fromName;
      this.logger.log('SMTP (Brevo) configurado correctamente');
    } else {
      this.logger.warn(
        'SMTP no configurado (faltan EMAIL_ENABLED/SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD) — los emails no se enviaran',
      );
    }
  }

  /** `html` is optional so callers without a matching template (or a future notification type
   * that hasn't been designed yet) still send a plain-text email instead of nothing. */
  async send(to: string, subject: string, text: string, html?: string): Promise<SendResult> {
    if (!this.transporter) {
      return { success: false, error: 'SMTP no esta configurado' };
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
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
