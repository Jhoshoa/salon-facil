import { NotificationType } from '@prisma/client';
import { emailUi, renderEmailLayout } from './email-layout';

/**
 * One metadata shape per notification type — call sites populate `metadata` alongside the
 * existing plain-text `title`/`content` (which stay as the SMS/WhatsApp/in-app text and as the
 * email's plain-text fallback part). Kept as a single union rather than one file per type: the
 * types are small, and having every shape in one place makes it obvious which fields a call
 * site still needs to add when a new notification is introduced.
 */
export type NotificationEmailMetadata =
  | { kind: 'welcome'; firstName: string; role: 'CLIENT' | 'OWNER' }
  | { kind: 'emailVerification'; code: string }
  | { kind: 'passwordReset'; resetUrl: string }
  | {
      kind: 'bookingRequest';
      venueName: string;
      eventType: string;
      guestCount: number;
      startDate: string;
      endDate: string;
      autoConfirmed: boolean;
    }
  | {
      kind: 'bookingConfirmed';
      variant: 'instant' | 'approved';
      venueName: string;
      eventDate: string;
      bookingId: string;
    }
  | {
      kind: 'bookingCancelled';
      variant: 'rejectedByOwner' | 'cancelledByClient';
      venueName: string;
      eventDate: string;
      reason?: string;
    }
  | { kind: 'reviewRequest'; venueName: string; bookingId: string }
  | {
      kind: 'reminder';
      venueName: string;
      eventType: string;
      eventDate: string;
      days: number;
      bookingId: string;
    }
  | {
      kind: 'paymentUploaded';
      venueName: string;
      paymentTypeLabel: string;
      amount: number;
      eventDate: string;
    }
  | {
      kind: 'paymentConfirmed';
      venueName: string;
      paymentTypeLabel: string;
      amount: number;
      bookingId: string;
    }
  | {
      kind: 'paymentRejected';
      venueName: string;
      paymentTypeLabel: string;
      amount: number;
      reason: string;
      bookingId: string;
    }
  | { kind: 'reviewResponse'; venueName: string; responseText: string; bookingId: string }
  | { kind: 'accountLinked'; provider: string };

const bs = (amount: number) => `Bs ${amount.toLocaleString('es-BO')}`;

/** Renders the HTML body for a notification, given its already-built plain-text `title` as a
 * fallback heading. Returns `null` when there's no metadata (older/unclassified jobs, or a
 * queue payload from before this field existed) — the caller falls back to plain text only,
 * never a broken half-built HTML email. */
export const buildNotificationEmailHtml = (
  type: NotificationType,
  title: string,
  metadata: NotificationEmailMetadata | undefined,
  frontendUrl: string,
): string | null => {
  if (!metadata) return null;
  const { button, detailsCard, codeBox, badge } = emailUi;

  switch (metadata.kind) {
    case 'welcome': {
      const isOwner = metadata.role === 'OWNER';
      const bodyHtml = `
        <p style="margin:0 0 4px;">Hola ${metadata.firstName},</p>
        <p style="margin:16px 0;">${
          isOwner
            ? 'Gracias por registrarte. Ya podés crear tu primer local y empezar a recibir reservas.'
            : 'Gracias por registrarte. Ya podés buscar y reservar locales para tu próximo evento.'
        }</p>
        ${button({
          label: isOwner ? 'Publicar mi espacio' : 'Buscar locales',
          url: `${frontendUrl}${isOwner ? '/dashboard/venues/new' : '/venues'}`,
        })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'emailVerification': {
      const bodyHtml = `
        <p style="margin:0;">Usá este código para verificar tu cuenta:</p>
        ${codeBox(metadata.code)}
        <p style="margin:0; font-size:13px; color:${emailUi.colors.muted};">Vence en 15 minutos. Si no pediste este código, podés ignorar este correo.</p>`;
      return renderEmailLayout({
        preheader: `Tu código de verificación: ${metadata.code}`,
        heading: 'Verificá tu email',
        bodyHtml,
      });
    }

    case 'passwordReset': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">Recibimos una solicitud para restablecer tu contraseña.</p>
        ${button({ label: 'Restablecer contraseña', url: metadata.resetUrl })}
        <p style="margin:16px 0 0; font-size:13px; color:${emailUi.colors.muted};">
          Si el botón no funciona, copiá y pegá este enlace: <a href="${metadata.resetUrl}" style="color:${emailUi.colors.navy};">${metadata.resetUrl}</a>
        </p>
        <p style="margin:16px 0 0; font-size:13px; color:${emailUi.colors.muted};">Vence en 1 hora. Si no fuiste vos, ignorá este mensaje — tu contraseña no va a cambiar.</p>`;
      return renderEmailLayout({
        preheader: 'Restablecé tu contraseña de Mi Evento',
        heading: 'Restablecé tu contraseña',
        bodyHtml,
      });
    }

    case 'bookingRequest': {
      const bodyHtml = `
        <p style="margin:0;">${
          metadata.autoConfirmed
            ? 'Se confirmó automáticamente porque tenés activada la reserva inmediata.'
            : 'Revisala en tu panel de reservas.'
        }</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Tipo de evento', value: metadata.eventType },
          { label: 'Invitados', value: String(metadata.guestCount) },
          { label: 'Fechas', value: `${metadata.startDate} — ${metadata.endDate}` },
        ])}
        ${button({ label: 'Ver en mi panel', url: `${frontendUrl}/dashboard/bookings` })}`;
      return renderEmailLayout({
        preheader: title,
        heading: metadata.autoConfirmed ? 'Reserva confirmada' : 'Nueva solicitud de reserva',
        bodyHtml,
      });
    }

    case 'bookingConfirmed': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge('Confirmada', 'success')}</p>
        <p style="margin:16px 0;">${
          metadata.variant === 'instant'
            ? 'Este local confirma sus reservas al instante. Ya podés subir el comprobante del anticipo.'
            : 'El propietario aprobó tu solicitud. Ya podés subir el comprobante del anticipo.'
        }</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Fecha', value: metadata.eventDate },
        ])}
        ${button({ label: 'Ver mi reserva', url: `${frontendUrl}/bookings/${metadata.bookingId}` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'bookingCancelled': {
      const toOwner = metadata.variant === 'cancelledByClient';
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge(toOwner ? 'Cancelada por el cliente' : 'Rechazada', 'warning')}</p>
        <p style="margin:16px 0;">${
          toOwner
            ? 'Las fechas quedaron liberadas en tu calendario.'
            : (metadata.reason ?? 'El propietario rechazó tu solicitud.')
        }</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Fecha', value: metadata.eventDate },
          ...(!toOwner && metadata.reason ? [{ label: 'Motivo', value: metadata.reason }] : []),
        ])}
        ${button({
          label: toOwner ? 'Ver mi calendario' : 'Buscar otro local',
          url: toOwner ? `${frontendUrl}/dashboard/bookings` : `${frontendUrl}/venues`,
          variant: 'secondary',
        })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'reviewRequest': {
      const bodyHtml = `
        <p style="margin:0 0 16px;">Contanos tu experiencia — tu reseña ayuda a otros a elegir mejor.</p>
        ${button({ label: 'Dejar mi reseña', url: `${frontendUrl}/bookings/${metadata.bookingId}` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'reminder': {
      const bodyHtml = `
        <p style="margin:0 0 16px;">Preparate todo para tu evento.</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Tipo de evento', value: metadata.eventType },
          { label: 'Fecha', value: metadata.eventDate },
        ])}
        ${button({ label: 'Ver mi reserva', url: `${frontendUrl}/bookings/${metadata.bookingId}` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'paymentUploaded': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge('Pendiente de revisión', 'neutral')}</p>
        <p style="margin:16px 0;">El cliente subió un comprobante. Revisalo en tu panel de reservas.</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Concepto', value: metadata.paymentTypeLabel },
          { label: 'Monto', value: bs(metadata.amount) },
          { label: 'Fecha del evento', value: metadata.eventDate },
        ])}
        ${button({ label: 'Revisar comprobante', url: `${frontendUrl}/dashboard/bookings` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'paymentConfirmed': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge('Confirmado', 'success')}</p>
        <p style="margin:16px 0;">Gracias por reservar con Mi Evento.</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Concepto', value: metadata.paymentTypeLabel },
          { label: 'Monto', value: bs(metadata.amount) },
        ])}
        ${button({ label: 'Ver mi reserva', url: `${frontendUrl}/bookings/${metadata.bookingId}` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'paymentRejected': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge('Rechazado', 'warning')}</p>
        <p style="margin:16px 0;">Podés subir un nuevo comprobante desde "Mis reservas".</p>
        ${detailsCard([
          { label: 'Local', value: metadata.venueName },
          { label: 'Concepto', value: metadata.paymentTypeLabel },
          { label: 'Monto', value: bs(metadata.amount) },
          { label: 'Motivo', value: metadata.reason },
        ])}
        ${button({ label: 'Subir nuevo comprobante', url: `${frontendUrl}/bookings/${metadata.bookingId}` })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'reviewResponse': {
      const bodyHtml = `
        <p style="margin:0 0 16px;">El propietario de ${metadata.venueName} respondió tu reseña:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px; background:${emailUi.colors.paper2}; border-left:3px solid ${emailUi.colors.gold};">
          <tr><td style="padding:16px 20px; font-style:italic; font-family:${emailUi.fonts.serif}; font-size:15px; color:${emailUi.colors.ink};">
            "${metadata.responseText}"
          </td></tr>
        </table>
        ${button({ label: 'Ver reseña', url: `${frontendUrl}/bookings/${metadata.bookingId}`, variant: 'secondary' })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    case 'accountLinked': {
      const bodyHtml = `
        <p style="margin:0 0 4px;">${badge('Alerta de seguridad', 'neutral')}</p>
        <p style="margin:16px 0;">
          Tu cuenta de Mi Evento ahora también se puede usar con ${metadata.provider} para iniciar sesión —
          detectamos que ya tenías una cuenta con este email y la vinculamos automáticamente.
        </p>
        <p style="margin:16px 0; font-size:13px; color:${emailUi.colors.muted};">
          Si no fuiste vos, cambiá tu contraseña de inmediato y escribinos a soporte.
        </p>
        ${button({ label: 'Ir a mi cuenta', url: `${frontendUrl}/dashboard/profile`, variant: 'secondary' })}`;
      return renderEmailLayout({ preheader: title, heading: title, bodyHtml });
    }

    default:
      return null;
  }
};

/** Kept for reference at call sites — not used directly here, but documents which `NotificationType`
 * each `metadata.kind` is expected to pair with, since the two aren't structurally linked. */
export const EXPECTED_METADATA_KIND: Record<
  NotificationType,
  NotificationEmailMetadata['kind'] | null
> = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'emailVerification',
  PASSWORD_RESET: 'passwordReset',
  BOOKING_REQUEST: 'bookingRequest',
  BOOKING_CONFIRMED: 'bookingConfirmed',
  BOOKING_CANCELLED: 'bookingCancelled',
  REVIEW_REQUEST: 'reviewRequest',
  REMINDER_7_DAYS: 'reminder',
  REMINDER_3_DAYS: 'reminder',
  REMINDER_1_DAY: 'reminder',
  PAYMENT_RECEIVED: null, // three metadata.kind variants (paymentUploaded/Confirmed/Rejected) share this one type
  REVIEW_RESPONSE: 'reviewResponse',
  ACCOUNT_LINKED: 'accountLinked',
};
