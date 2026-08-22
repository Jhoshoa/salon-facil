import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const SubmitButton = ({
  children,
  isLoading = false,
  loadingText = 'Guardando...',
  disabled,
  ...props
}: SubmitButtonProps) => (
  <Button disabled={disabled || isLoading} {...props}>
    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
    {isLoading ? loadingText : children}
  </Button>
);
