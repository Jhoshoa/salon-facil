import { Skeleton } from '@/components/ui/skeleton';

export const VenueCardSkeleton = () => (
  <article className="sf-result-card grid-cols-[96px_1fr] gap-3 md:grid-cols-[280px_1fr] md:gap-4">
    <Skeleton className="sf-result-image" />
    <div className="space-y-2 py-0.5 md:space-y-3 md:py-1">
      <div>
        <Skeleton className="h-5 w-2/3 md:h-6 md:w-3/4" />
        <div className="mt-1.5 flex gap-3">
          <Skeleton className="h-3.5 w-24 md:h-4 md:w-28" />
          <Skeleton className="hidden h-4 w-16 md:block" />
        </div>
      </div>
      <Skeleton className="hidden h-10 w-full md:block" />
      <div className="hidden gap-2 md:flex">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="hidden gap-1.5 sm:grid-cols-2 md:grid">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="sf-result-footer">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20 md:h-6 md:w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full md:h-9 md:w-28 md:rounded-md" />
      </div>
    </div>
  </article>
);
