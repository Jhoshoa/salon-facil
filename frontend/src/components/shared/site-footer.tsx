import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const footerColumns = [
  {
    title: 'Explorar',
    links: [
      { label: 'Salones', href: '/venues?spaceType=EVENT_HALL' },
      { label: 'Jardines', href: '/venues?spaceType=GARDEN' },
      { label: 'Terrazas', href: '/venues?spaceType=TERRACE' },
      { label: 'Estudios', href: '/venues?spaceType=PHOTO_STUDIO' },
    ],
  },
  {
    title: 'Owners',
    links: [
      { label: 'Publicar espacio', href: '/propietarios' },
      { label: 'Gestionar reservas', href: '/dashboard' },
      { label: 'Calendario', href: '/dashboard/calendar' },
      { label: 'Pagos', href: '/dashboard/bookings' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { label: 'Ayuda', href: '/help' },
      { label: 'Seguridad', href: '/security' },
      { label: 'Terminos y condiciones', href: '/terminos' },
      { label: 'Politica de privacidad', href: '/privacidad' },
      { label: 'Contacto', href: '/contact' },
    ],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="sf-footer">
      <div className="sf-container border-b border-border pb-9 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
                  <circle
                    cx="16"
                    cy="16"
                    r="14.5"
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1"
                    opacity=".5"
                  />
                  <path
                    d="M16 6 L18.4 14 L26 16 L18.4 18 L16 26 L13.6 18 L6 16 L13.6 14 Z"
                    fill="#C9A227"
                  />
                </svg>
              </span>
              <span className="font-serif text-lg italic text-foreground">SalonFacil</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Un catalogo curado de espacios para eventos en todo Bolivia, con datos claros de
              capacidad, comodidades y disponibilidad.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent-foreground" />
              Espacios verificados
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="sf-link-muted text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="sf-container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>SalonFacil 2026. Todos los derechos reservados.</span>
        <span>Hecho en Bolivia</span>
      </div>
    </footer>
  );
};
