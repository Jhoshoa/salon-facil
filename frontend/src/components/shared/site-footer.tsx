import Link from 'next/link';
import { CalendarCheck, ShieldCheck } from 'lucide-react';

const footerColumns = [
  {
    title: 'Explorar',
    links: ['Salones', 'Jardines', 'Terrazas', 'Estudios'],
  },
  {
    title: 'Owners',
    links: ['Publicar espacio', 'Gestionar reservas', 'Calendario', 'Pagos'],
  },
  {
    title: 'Soporte',
    links: ['Ayuda', 'Seguridad', 'Politicas', 'Contacto'],
  },
];

export const SiteFooter = () => {
  return (
    <footer className="sf-footer">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-bold">SalonFacil</span>
              <span className="block text-sm text-muted-foreground">Espacios para eventos</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Marketplace para descubrir, comparar y reservar espacios con datos claros de capacidad,
            comodidades y disponibilidad.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Espacios verificados y flujo trazable
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="/venues" className="transition-colors hover:text-primary">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>SalonFacil 2026</span>
          <span>Construido para reservas de eventos en Bolivia</span>
        </div>
      </div>
    </footer>
  );
};
