import type { Metadata } from 'next';
import {
  VenueInvitePreview,
  VenueInvitePreviewHeader,
} from '@/components/venues/venue-invite-preview';

interface PreviewPageProps {
  params: { token: string };
}

// Always noindex — this is a private share link (like a Google Docs "anyone with the link" page),
// never a page meant to show up in search results, regardless of the venue's own status.
export const metadata: Metadata = {
  title: 'Vista previa de tu local — Mi Evento',
  robots: { index: false, follow: false },
};

export default function PreviewVenuePage({ params }: PreviewPageProps) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <VenueInvitePreviewHeader />
        <VenueInvitePreview token={params.token} />
      </div>
    </main>
  );
}
