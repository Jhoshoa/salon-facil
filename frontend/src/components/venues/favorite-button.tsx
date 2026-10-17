'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavorite, getMyFavoriteIds, removeFavorite } from '@/lib/api/venues.api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { FavoriteLoginModal } from './favorite-login-modal';

const FAVORITE_IDS_KEY = ['venue-favorite-ids'];

interface FavoriteButtonProps {
  venueId: string;
  className?: string;
  /** 'overlay' (default): light button floating over a photo (search card, hero gallery).
   * 'solid': regular button on a plain background (venue detail actions row). */
  variant?: 'overlay' | 'solid';
}

/** Purely a private bookmark -- no rating, no comment, no booking involved. Sits on venue
 * cards and the detail page; works the same in both places via this one component. */
export const FavoriteButton = ({
  venueId,
  className,
  variant = 'overlay',
}: FavoriteButtonProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: favoriteIds } = useQuery({
    queryKey: FAVORITE_IDS_KEY,
    queryFn: getMyFavoriteIds,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const isFavorited = favoriteIds?.includes(venueId) ?? false;

  const applyOptimisticToggle = (next: boolean) => {
    queryClient.setQueryData<string[]>(FAVORITE_IDS_KEY, (old) => {
      if (next) return old ? [...old, venueId] : [venueId];
      return (old ?? []).filter((id) => id !== venueId);
    });
  };

  const invalidateFavorites = () => {
    queryClient.invalidateQueries({ queryKey: FAVORITE_IDS_KEY });
    queryClient.invalidateQueries({ queryKey: ['venue-favorites'] });
  };

  const addMutation = useMutation({
    mutationFn: () => addFavorite(venueId),
    onMutate: () => applyOptimisticToggle(true),
    onError: () => applyOptimisticToggle(false),
    onSettled: invalidateFavorites,
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFavorite(venueId),
    onMutate: () => applyOptimisticToggle(false),
    onError: () => applyOptimisticToggle(true),
    onSettled: invalidateFavorites,
  });

  const handleClick = (event: React.MouseEvent) => {
    // Favorite buttons sit inside a <Link> on venue cards -- never let the click bubble into
    // a card navigation.
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (isFavorited) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={isFavorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        aria-pressed={isFavorited}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          variant === 'overlay'
            ? 'bg-card/90 text-foreground shadow-sm hover:bg-card'
            : 'border border-border bg-card hover:bg-accent',
          className,
        )}
      >
        <Heart
          className={cn(
            'h-5 w-5 transition-colors',
            // Matches the star-rating color already used on venue cards (fill-amber-400) rather
            // than reaching for `destructive` (reserved for errors/delete actions elsewhere).
            isFavorited ? 'fill-amber-400 text-amber-400' : 'text-foreground',
          )}
        />
      </button>
      <FavoriteLoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </>
  );
};
