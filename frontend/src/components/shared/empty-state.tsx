import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-8 text-center',
        className,
      )}
    >
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};
