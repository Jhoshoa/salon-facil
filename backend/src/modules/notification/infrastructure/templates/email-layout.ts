/**
 * Shared HTML building blocks for transactional emails. Email clients (Outlook especially)
 * don't reliably support CSS custom properties, flexbox/grid, external stylesheets, or
 * @font-face — everything here is table-based layout with inline styles and web-safe font
 * stacks, deliberately not reusing the app's `globals.css` tokens or `LogoMark` component
 * directly. Colors are the literal hex values from `frontend/src/app/globals.css`
 * (`--primary`/`--secondary`/etc.) copied by hand, since email HTML can't read CSS variables.
 */

export const BRAND = {
  navy: '#1E3A5F',
  ink: '#10202F',
  gold: '#C9A227',
  goldDeep: '#A9861D',
  goldPale: '#FBF3DC',
  paper: '#FFFFFF',
  paper2: '#F5F1E8',
  border: '#E2DFD6',
  muted: '#5B6570',
  success: '#1E9E5A',
  warning: '#B8860B',
} as const;

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const SERIF = `Georgia, 'Times New Roman', serif`;

/** The `LogoMark` diamond, redrawn as inline SVG — same facet geometry as
 * `frontend/src/components/shared/logo-mark.tsx`, but with the colors baked in as literals
 * (no `hsl(var(--primary))`) since email HTML can't resolve CSS variables. Inline SVG renders
 * in Gmail, Apple Mail and most mobile clients; Outlook desktop drops it silently, which is why
 * the header always pairs it with a text wordmark rather than relying on the mark alone. */
const logoMarkSvg = (size = 32) =>
  `
<svg width="${size}" height="${size}" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="lmClip"><rect x="10" y="10" width="32" height="32" rx="8" transform="rotate(45 26 26)"/></clipPath></defs>
  <g clip-path="url(#lmClip)" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="0.5">
    <polygon points="26,4 4,26 26,20" fill="${BRAND.navy}"/>
    <polygon points="4,26 26,48 26,20" fill="${BRAND.navy}"/>
    <polygon points="26,4 48,26 26,20" fill="${BRAND.gold}"/>
    <polygon points="48,26 26,48 26,20" fill="${BRAND.gold}"/>
  </g>
  <rect x="10" y="10" width="32" height="32" rx="8" transform="rotate(45 26 26)" fill="none" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="0.6"/>
  <circle cx="26" cy="20" r="3" fill="${BRAND.gold}" stroke="#FFFFFF" stroke-width="0.8"/>
</svg>`.trim();

export interface EmailButton {
  label: string;
  url: string;
  /** primary = solid gold (the app's one high-emphasis action color); secondary = navy outline. */
  variant?: 'primary' | 'secondary';
}

const renderButton = ({ label, url, variant = 'primary' }: EmailButton): string => {
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? BRAND.gold : BRAND.paper;
  const color = isPrimary ? BRAND.ink : BRAND.navy;
  const border = isPrimary ? BRAND.gold : BRAND.navy;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:2px; background:${bg}; border:1px solid ${border};">
      <a href="${url}" target="_blank" style="display:inline-block; padding:13px 28px; font-family:${SANS}; font-size:15px; font-weight:600; color:${color}; text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
};

export interface DetailRow {
  label: string;
  value: string;
}

/** A hairline-separated key/value card — the same visual idiom as the site's `.sf-hairline-row`
 * (see the landing/detail redesign), reproduced with table borders since email HTML can't use
 * `border-top` on a `<div>` reliably across clients. */
const renderDetailsCard = (rows: DetailRow[]): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0; background:${BRAND.paper2}; border:1px solid ${BRAND.border};">
  <tr><td style="padding:4px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${rows
        .map(
          (row, i) => `
      <tr>
        <td style="padding:12px 0; ${i > 0 ? `border-top:1px solid ${BRAND.border};` : ''} font-family:${SANS}; font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:${BRAND.muted}; white-space:nowrap; vertical-align:top; width:1%;">${row.label}</td>
        <td style="padding:12px 0 12px 16px; ${i > 0 ? `border-top:1px solid ${BRAND.border};` : ''} font-family:${SANS}; font-size:14px; color:${BRAND.ink}; text-align:right;">${row.value}</td>
      </tr>`,
        )
        .join('')}
    </table>
  </td></tr>
</table>`;

/** The 6-digit verification code, in a large letter-spaced box — the one email where the
 * "action" is reading a value and retyping it elsewhere, not clicking a link. */
const renderCodeBox = (code: string): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center" style="background:${BRAND.goldPale}; border:1px solid ${BRAND.gold}; padding:22px 0;">
      <span style="font-family:${SANS}; font-size:34px; font-weight:700; letter-spacing:0.35em; color:${BRAND.ink};">${code}</span>
    </td>
  </tr>
</table>`;

export type BadgeTone = 'success' | 'warning' | 'neutral';

const renderBadge = (label: string, tone: BadgeTone): string => {
  const colors: Record<BadgeTone, { bg: string; fg: string }> = {
    success: { bg: '#E7F7EE', fg: BRAND.success },
    warning: { bg: '#FBF1DC', fg: BRAND.warning },
    neutral: { bg: BRAND.paper2, fg: BRAND.navy },
  };
  const c = colors[tone];
  return `<span style="display:inline-block; padding:4px 12px; border-radius:999px; background:${c.bg}; color:${c.fg}; font-family:${SANS}; font-size:12px; font-weight:700; letter-spacing:0.02em;">${label}</span>`;
};

export interface EmailLayoutParams {
  preheader: string;
  heading: string;
  bodyHtml: string;
}

/** Wraps a template's content in the header (logo + wordmark on navy), white content area, and
 * footer common to every transactional email. `preheader` is the hidden preview-text snippet
 * most clients show next to the subject line in the inbox list. */
export const renderEmailLayout = ({ preheader, heading, bodyHtml }: EmailLayoutParams): string => `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mi Evento</title>
</head>
<body style="margin:0; padding:0; background:${BRAND.paper2}; font-family:${SANS};">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.paper2};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px; background:${BRAND.paper};">

        <tr>
          <td style="background:${BRAND.navy}; padding:20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:10px; vertical-align:middle;">${logoMarkSvg(28)}</td>
                <td style="vertical-align:middle;">
                  <span style="font-family:${SERIF}; font-style:italic; font-size:20px; color:#FFFFFF;">Mi Evento</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 32px 8px;">
            <h1 style="margin:0 0 18px; font-family:${SERIF}; font-weight:normal; font-size:24px; line-height:1.3; color:${BRAND.ink};">${heading}</h1>
            <div style="font-family:${SANS}; font-size:15px; line-height:1.6; color:${BRAND.ink};">
              ${bodyHtml}
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BRAND.border}; padding-top:20px;">
              <tr>
                <td style="font-family:${SANS}; font-size:12px; line-height:1.6; color:${BRAND.muted};">
                  Recibiste este correo porque tenés una cuenta en <a href="https://mievento.com.bo" style="color:${BRAND.navy};">Mi Evento</a>.<br>
                  Mi Evento — Bolivia
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

export const emailUi = {
  button: renderButton,
  detailsCard: renderDetailsCard,
  codeBox: renderCodeBox,
  badge: renderBadge,
  colors: BRAND,
  fonts: { sans: SANS, serif: SERIF },
};
