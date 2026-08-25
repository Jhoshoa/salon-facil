import { Skeleton } from '@/components/ui/skeleton';

export const VenueCardSkeleton = () => (
  <article className="sf-result-card">
    <Skeleton className="sf-result-image" />
    <div className="space-y-3 py-1">
      <div>
        <Skeleton className="h-6 w-3/4" />
        <div className="mt-1.5 flex gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
      <div className="sf-result-footer">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  </article>
);
