import {
  ArrowRight,
  Camera,
  Flower2,
  MapPin,
  PartyPopper,
  Presentation,
  Users,
} from 'lucide-react';
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
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Explora por estilo</p>
          <h2 className="mt-1 text-2xl font-bold tracking-normal sm:text-3xl">
            Espacios pensados para comparar rapido
          </h2>
        </div>
        <div className="hidden items-center gap-2 text-sm font-medium text-primary sm:flex">
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuredSpaces.map((space) => {
          const Icon = space.Icon;

          return (
            <article key={space.title} className="sf-carousel-card">
              <div className="sf-soft-gradient relative flex aspect-[4/3] items-center justify-center">
                <Icon className="h-16 w-16 text-primary" />
                <div className="absolute left-3 top-3">
                  <Badge className="bg-card/95 text-primary">{space.capacity}</Badge>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="text-lg font-semibold">{space.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {space.location}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Opciones con disponibilidad y filtros por aforo
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
