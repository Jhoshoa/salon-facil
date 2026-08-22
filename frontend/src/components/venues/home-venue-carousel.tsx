import Link from 'next/link';
import { ArrowRight, Camera, Flower2, MapPin, PartyPopper, Presentation, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const featuredSpaces = [
  {
    title: 'Salones para bodas',
    location: 'La Paz y El Alto',
    capacity: '80-350 personas',
    Icon: PartyPopper,
  },
  {
    title: 'Terrazas privadas',
    location: 'Sopocachi, Calacoto',
    capacity: '30-140 personas',
    Icon: Presentation,
  },
  {
    title: 'Jardines y exteriores',
    location: 'Achocalla y Zona Sur',
    capacity: '120-500 personas',
    Icon: Flower2,
  },
  {
    title: 'Estudios creativos',
    location: 'Calacoto y Obrajes',
    capacity: '10-70 personas',
    Icon: Camera,
  },
];

export const HomeVenueCarousel = () => {
  return (
    <section className="sf-section">
      <div className="sf-container">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="accent" className="mb-3">
              Explora por estilo
            </Badge>
            <h2 className="text-2xl font-bold sm:text-3xl">Espacios pensados para comparar rapido</h2>
          </div>
          <Link
            href="/venues"
            className="hidden items-center gap-2 text-sm font-medium text-primary hover:underline sm:flex"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredSpaces.map((space) => {
            const Icon = space.Icon;

            return (
              <article key={space.title} className="sf-carousel-card">
                <div className="sf-carousel-image">
                  <Icon className="h-14 w-14 text-primary" />
                  <div className="absolute left-3 top-3">
                    <Badge variant="secondary">{space.capacity}</Badge>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-lg font-semibold">{space.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {space.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    Opciones con disponibilidad
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <Link
          href="/venues"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline sm:hidden"
        >
          Ver todos los espacios
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
};
