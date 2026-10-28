import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import './globals.css';

// Self-hosted (not next/font/google) on purpose: that fetched these same files from Google's
// CDN at *build* time, and that fetch has failed CI builds outright (next/font/google throwing
// "Cannot read properties of null (reading '1')" when the request is blocked/rate-limited) --
// not a code issue, just the build depending on a third-party network call that isn't always
// reliable from CI runners. Both Inter and Fraunces ship on Google Fonts as variable fonts, so
// one file per style covers the whole weight range; these are the exact files Google was already
// serving (fetched once, vendored here), just referenced locally now.
const inter = localFont({
  src: [
    { path: './fonts/inter/inter-variable.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter/inter-variable.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter/inter-variable.woff2', weight: '600', style: 'normal' },
    { path: './fonts/inter/inter-variable.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = localFont({
  src: [
    { path: './fonts/fraunces/fraunces-variable.woff2', weight: '400', style: 'normal' },
    { path: './fonts/fraunces/fraunces-variable.woff2', weight: '500', style: 'normal' },
    { path: './fonts/fraunces/fraunces-variable.woff2', weight: '600', style: 'normal' },
    { path: './fonts/fraunces/fraunces-italic-variable.woff2', weight: '400', style: 'italic' },
    { path: './fonts/fraunces/fraunces-italic-variable.woff2', weight: '500', style: 'italic' },
    { path: './fonts/fraunces/fraunces-italic-variable.woff2', weight: '600', style: 'italic' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mi Evento - Encuentra el local perfecto para tu evento',
  description:
    'Alquiler de locales para bodas, quinceañeras, cumpleaños y eventos en El Alto, Bolivia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
