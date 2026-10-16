'use client';

import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AppDrawerProps {
  open: boolean;
  /** Usually plain text (gets the app's standard serif dialog-title style via the global h1-h6
   * rule in globals.css). Pass a styled node instead when a specific drawer needs to opt out of
   * that -- see the "fecha especifica" drawer in venue-form.tsx for an example that overrides
   * just itself with `font-sans`, without touching this component or any other drawer. */
  title: ReactNode;
  description?: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}

export const AppDrawer = ({ open, title, description, children, onOpenChange }: AppDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-6 flex flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
};
