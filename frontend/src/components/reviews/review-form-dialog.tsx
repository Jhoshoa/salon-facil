'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createReview } from '@/lib/api/reviews.api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StarRating } from './star-rating';

interface ReviewFormDialogProps {
  bookingId: string;
  venueName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReviewFormDialog = ({
  bookingId,
  venueName,
  open,
  onOpenChange,
}: ReviewFormDialogProps) => {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => createReview(bookingId, { rating, comment: comment.trim() || undefined }),
    onSuccess: async () => {
      toast.success('Gracias por tu resena');
      onOpenChange(false);
      setRating(0);
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['booking', bookingId, 'review'] });
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo enviar tu resena', { description: error.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{venueName ? `Calificar ${venueName}` : 'Calificar reserva'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="sf-form-group">
            <Label>Tu calificacion</Label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div className="sf-form-group">
            <Label htmlFor="review-comment">Comentario (opcional)</Label>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder="Cuenta como fue tu experiencia en este espacio..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={rating === 0 || mutation.isPending}
          >
            Enviar resena
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
