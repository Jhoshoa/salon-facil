import { Skeleton } from '@/components/ui/skeleton';

export const VenueCardSkeleton = () => (
  <div className="sf-card grid gap-4 overflow-hidden p-3 md:grid-cols-[280px_1fr_200px]">
    <Skeleton className="aspect-[4/3] md:aspect-auto md:min-h-[200px]" />
    <div className="space-y-3 py-1">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
    <div className="sf-surface space-y-4 border p-4 md:text-right">
      <div className="space-y-2">
        <Skeleton className="ml-auto h-4 w-12" />
        <Skeleton className="ml-auto h-8 w-24" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);
