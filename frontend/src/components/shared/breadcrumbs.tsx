import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** "Where am I / where did I come from" trail for pages nested under a list (venue edit,
 * booking detail, admin catalog items, etc). The last item is always the current page and
 * never a link, even if it was given an href. */
export const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => (
  <nav
    aria-label="Ruta de navegacion"
    className={cn('mb-4 flex flex-wrap items-center gap-1.5 text-sm', className)}
  >
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          ) : null}
          {item.href && !isLast ? (
            <Link href={item.href} className="text-muted-foreground hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span
              aria-current={isLast ? 'page' : undefined}
              className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}
            >
              {item.label}
            </span>
          )}
        </span>
      );
    })}
  </nav>
);
