import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const VenueCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-3 md:grid-cols-[260px_1fr_190px]">
        <Skeleton className="aspect-[4/3] w-full md:aspect-auto" />
        <div className="space-y-3 py-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <div className="space-y-4 border-t pt-3 md:border-l md:border-t-0 md:pl-4">
          <Skeleton className="ml-auto h-7 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
};
