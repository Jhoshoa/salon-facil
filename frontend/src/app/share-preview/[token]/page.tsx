import type { Metadata } from 'next';
import { Eye } from 'lucide-react';
import { VenueDetail } from '@/components/venues/venue-detail';
import { SiteHeader } from '@/components/shared/site-header';

interface SharePreviewPageProps {
  params: { token: string };
}

// Always noindex -- same spirit as /preview/[token]: a private share link, never meant to show
// up in search results.
export const metadata: Metadata = {
  title: 'Vista previa de un local — Mi Evento',
  robots: { index: false, follow: false },
};

// Same chrome as the real public venue page (/venues/[slug]) -- the whole point of this link is
// showing exactly what the real page would look like, not a stripped-down summary.
export default function SharePreviewVenuePage({ params }: SharePreviewPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 rounded-[var(--radius)] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0 text-primary" />
          Vista previa temporal — este enlace solo sirve para ver el local, no activa ninguna cuenta
          ni permite reservar.
        </div>
        <VenueDetail shareToken={params.token} />
      </div>
    </main>
  );
}
