import type { Metadata } from 'next';
import {
  VenueSharePreview,
  VenueInvitePreviewHeader,
} from '@/components/venues/venue-invite-preview';

interface SharePreviewPageProps {
  params: { token: string };
}

// Always noindex -- same spirit as /preview/[token]: a private share link, never meant to show
// up in search results.
export const metadata: Metadata = {
  title: 'Vista previa de un local — Mi Evento',
  robots: { index: false, follow: false },
};

export default function SharePreviewVenuePage({ params }: SharePreviewPageProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <VenueInvitePreviewHeader />
        <VenueSharePreview token={params.token} />
      </div>
    </main>
  );
}
