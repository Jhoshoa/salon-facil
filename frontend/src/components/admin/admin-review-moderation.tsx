'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReview, getAdminReviews, respondToReview } from '@/lib/api/reviews.api';
import { formatDate } from '@/lib/formatters';
import { StarRating } from '@/components/reviews/star-rating';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import type { AdminReview } from '@/types/api';

const MIN_SEARCH_LENGTH = 3;
const LIMIT = 20;

interface ReplyFormProps {
  review: AdminReview;
  onDone: () => void;
}

const ReplyForm = ({ review, onDone }: ReplyFormProps) => {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState('');

  const mutation = useMutation({
    mutationFn: () => respondToReview(review.id, response.trim()),
    onSuccess: async () => {
      toast.success('Respuesta enviada');
      onDone();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
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
        placeholder="Responde a esta reseña (como ADMIN)..."
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

export const AdminReviewModeration = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [rating, setRating] = useState<number | ''>('');
  const [hasResponse, setHasResponse] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<AdminReview | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const activeQuery = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const query = useQuery({
    queryKey: ['admin', 'reviews', activeQuery, rating, hasResponse, page],
    queryFn: () =>
      getAdminReviews({
        search: activeQuery || undefined,
        rating: rating || undefined,
        hasResponse: hasResponse === '' ? undefined : hasResponse === 'true',
        page,
        limit: LIMIT,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Reseña eliminada');
      setReviewToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar la reseña', { description: error.message });
    },
  });

  const reviews = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;
  const hasActiveFilters = Boolean(activeQuery || rating || hasResponse);

  const resetToFirstPage = () => setPage(1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            resetToFirstPage();
          }}
          placeholder="Buscar por local, cliente o comentario..."
        />
        <Select
          value={rating}
          onChange={(event) => {
            setRating(event.target.value ? Number(event.target.value) : '');
            resetToFirstPage();
          }}
          className="sm:w-40"
          aria-label="Filtrar por calificacion"
        >
          <option value="">Todas las calificaciones</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} estrella{value === 1 ? '' : 's'}
            </option>
          ))}
        </Select>
        <Select
          value={hasResponse}
          onChange={(event) => {
            setHasResponse(event.target.value as '' | 'true' | 'false');
            resetToFirstPage();
          }}
          className="sm:w-52"
          aria-label="Filtrar por respuesta"
        >
          <option value="">Con o sin respuesta</option>
          <option value="true">Con respuesta</option>
          <option value="false">Sin respuesta</option>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="No se pudieron cargar las reseñas" onRetry={() => query.refetch()} />
      ) : !reviews.length ? (
        <EmptyState
          icon={MessageSquare}
          title={hasActiveFilters ? 'Sin resultados' : 'Todavia no hay reseñas'}
          description={
            hasActiveFilters
              ? 'Ninguna reseña coincide con la busqueda y los filtros aplicados.'
              : 'Las reseñas que dejen los clientes van a aparecer aca.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} reseña{total === 1 ? '' : 's'} en total
          </p>
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="sf-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {review.venue ? (
                      <Link
                        href={`/admin/venues/all/${review.venue.id}/preview`}
                        className="font-semibold hover:underline"
                      >
                        {review.venue.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Local eliminado</span>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {review.client?.fullName ?? 'Cliente'} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} size="sm" />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      title="Eliminar reseña"
                      onClick={() => setReviewToDelete(review)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

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
                ) : respondingTo === review.id ? (
                  <ReplyForm review={review} onDone={() => setRespondingTo(null)} />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setRespondingTo(review.id)}
                  >
                    Responder
                  </Button>
                )}
              </article>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={Boolean(reviewToDelete)}
        title="Eliminar reseña"
        description="Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setReviewToDelete(null);
        }}
        onConfirm={() => {
          if (reviewToDelete) deleteMutation.mutate(reviewToDelete.id);
        }}
      />
    </div>
  );
};
