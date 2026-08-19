import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SalonFacil - Encuentra el local perfecto para tu evento',
  description:
    'Alquiler de locales para bodas, quinceaneras, cumpleanos y eventos en El Alto, Bolivia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
