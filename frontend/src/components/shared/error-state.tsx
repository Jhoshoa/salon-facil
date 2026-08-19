import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({
  title = 'No se pudo cargar la informacion',
  description = 'Revisa tu conexion e intenta nuevamente.',
  onRetry,
  className,
}: ErrorStateProps) => {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center rounded-md border bg-background p-8 text-center',
        className,
      )}
    >
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
};
