'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner className="toaster group" toastOptions={{ classNames: { toast: 'group toast' } }} {...props} />;
};

export { Toaster };
