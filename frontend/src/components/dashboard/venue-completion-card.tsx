'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, Send } from 'lucide-react';
import { getVenueCompletion } from '@/lib/api/venues.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PublishVenueDialog } from './publish-venue-dialog';
import type { Venue } from '@/types/api';

interface VenueCompletionCardProps {
  venue: Venue;
}

const statusLabels: Record<Venue['status'], string> = {
  DRAFT: 'Borrador',
  PENDING: 'En revision',
  ACTIVE: 'Publicado',
  INACTIVE: 'Inactivo',
  REJECTED: 'Rechazado',
};

export const VenueCompletionCard = ({ venue }: VenueCompletionCardProps) => {
  const query = useQuery({
    queryKey: ['owner-venue', venue.id, 'completion'],
    queryFn: () => getVenueCompletion(venue.id),
  });

  const canSubmit = venue.status === 'DRAFT' || venue.status === 'REJECTED';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Estado del local</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            {statusLabels[venue.status]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : query.data ? (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completitud</span>
                <span className="font-semibold">{query.data.score}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${query.data.score}%` }}
                />
              </div>
            </div>

            {query.data.missing.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {query.data.missing.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CircleDashed className="h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Toda la informacion requerida esta completa.
              </p>
            )}

            {canSubmit ? (
              <PublishVenueDialog
                venueId={venue.id}
                disabled={!query.data.canPublish}
                trigger={
                  <Button className="w-full" disabled={!query.data.canPublish}>
                    <Send className="h-4 w-4" />
                    Enviar a revision
                  </Button>
                }
              />
            ) : venue.status === 'PENDING' ? (
              <p className="text-sm text-muted-foreground">
                Tu local esta en revision. Te avisaremos cuando sea aprobado.
              </p>
            ) : venue.status === 'ACTIVE' ? (
              <p className="text-sm text-muted-foreground">Tu local esta activo y visible.</p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
