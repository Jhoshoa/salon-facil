'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getVenueReviews, respondToReview } from '@/lib/api/reviews.api';
import { formatDate } from '@/lib/formatters';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from './star-rating';
import type { Review } from '@/types/api';

interface VenueReviewsProps {
  venueId: string;
  ownerId?: string;
  averageRating?: number;
  reviewCount?: number;
}

interface OwnerResponseFormProps {
  review: Review;
  venueId: string;
  onDone: () => void;
}

const OwnerResponseForm = ({ review, venueId, onDone }: OwnerResponseFormProps) => {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState('');

  const mutation = useMutation({
    mutationFn: () => respondToReview(review.id, response.trim()),
    onSuccess: async () => {
      toast.success('Respuesta enviada');
      onDone();
      await queryClient.invalidateQueries({ queryKey: ['venue', venueId, 'reviews'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar la respuesta', { description: error.message });
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <textarea
        rows={3}
        maxLength={1000}
        className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        placeholder="Responde a esta resena..."
        value={response}
        onChange={(event) => setResponse(event.target.value)}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!response.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Enviar respuesta
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export const VenueReviews = ({ venueId, ownerId, averageRating, reviewCount }: VenueReviewsProps) => {
  const [page, setPage] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const isVenueOwner = Boolean(ownerId) && currentUser?.id === ownerId;

  const query = useQuery({
    queryKey: ['venue', venueId, 'reviews', page],
    queryFn: () => getVenueReviews(venueId, page, 10),
  });

  return (
    <section className="sf-detail-section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="sf-detail-title">Resenas</h2>
        {averageRating ? (
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {averageRating.toFixed(1)}
            <span className="font-normal text-muted-foreground">
              ({reviewCount ?? 0} {reviewCount === 1 ? 'resena' : 'resenas'})
            </span>
          </p>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          className="mt-4"
          title="No se pudieron cargar las resenas"
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.data && query.data.data?.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={MessageSquare}
          title="Este local aun no tiene resenas"
          description="Las resenas apareceran cuando clientes con reservas completadas dejen su calificacion."
        />
      ) : null}

      {query.data && query.data.data && query.data.data.length > 0 ? (
        <div className="mt-4 space-y-4">
          {query.data.data.map((review) => (
            <div key={review.id} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {review.client ? getInitials(review.client.fullName) : '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{review.client?.fullName ?? 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
                <StarRating value={review.rating} size="sm" />
                {review.comment ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                ) : null}

                {review.ownerResponse ? (
                  <div className="mt-3 rounded-md bg-muted p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Respuesta del propietario
                    </p>
                    <p className="mt-1 text-sm leading-6">{review.ownerResponse}</p>
                  </div>
                ) : isVenueOwner ? (
                  respondingTo === review.id ? (
                    <OwnerResponseForm
                      review={review}
                      venueId={venueId}
                      onDone={() => setRespondingTo(null)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setRespondingTo(review.id)}
                    >
                      Responder
                    </Button>
                  )
                ) : null}
              </div>
            </div>
          ))}

          {query.data.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {query.data.page} de {query.data.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= query.data.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
