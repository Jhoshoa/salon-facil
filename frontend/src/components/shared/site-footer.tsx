import Link from 'next/link';
import { CalendarCheck, ShieldCheck } from 'lucide-react';

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
      { label: 'Publicar espacio', href: '/register' },
      { label: 'Gestionar reservas', href: '/dashboard' },
      { label: 'Calendario', href: '/dashboard/calendar' },
      { label: 'Pagos', href: '/dashboard/payments' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { label: 'Ayuda', href: '/help' },
      { label: 'Seguridad', href: '/security' },
      { label: 'Politicas', href: '/policies' },
      { label: 'Contacto', href: '/contact' },
    ],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="sf-footer">
      <div className="sf-container grid gap-10 py-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="sf-logo">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold">SalonFacil</span>
              <span className="block text-sm text-muted-foreground">Espacios para eventos</span>
            </span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            Marketplace para descubrir, comparar y reservar espacios con datos claros de capacidad,
            comodidades y disponibilidad.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Espacios verificados
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-4 space-y-3">
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

      <div className="border-t">
        <div className="sf-container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>SalonFacil 2026. Todos los derechos reservados.</span>
          <span>Hecho en Bolivia</span>
        </div>
      </div>
    </footer>
  );
};
