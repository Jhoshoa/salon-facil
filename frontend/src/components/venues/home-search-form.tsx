'use client';

import { FormEvent, MouseEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SearchErrors {
  startDate?: string;
  endDate?: string;
  capacity?: string;
}

const journalInputClass =
  'h-auto w-full rounded-none border-0 border-b border-foreground bg-transparent px-0 pb-1.5 pt-1 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0';

export const HomeSearchForm = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState<SearchErrors>({});
  const [isSwaying, setIsSwaying] = useState(false);

  /** Starts the "hung fabric" hover sway (see .sf-journal-bar in globals.css) — a class
   * toggle instead of a plain CSS :hover trigger so the animation always plays to
   * completion even if the pointer leaves right away, instead of snapping back mid-swing. */
  const handleMouseEnter = (event: MouseEvent<HTMLFormElement>) => {
    if ((event.target as HTMLElement).closest('input')) return;
    setIsSwaying(true);
  };

  const validate = () => {
    const parsedCapacity = Number(capacity);
    const nextErrors: SearchErrors = {};

    if (!startDate) nextErrors.startDate = 'La fecha es obligatoria.';
    if (!capacity || Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      nextErrors.capacity = 'La cantidad de personas es obligatoria.';
    }
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = 'La fecha final no puede ser anterior a la inicial.';
    }

    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;

    if (!isValid) {
      toast.warning('Completa los datos requeridos', {
        description: 'Necesitamos fecha de inicio y cantidad de invitados para buscar.',
      });
    }

    return isValid;
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setErrors((prev) => {
      if (!prev.startDate && !prev.endDate) return prev;
      const next = { ...prev };
      if (value) delete next.startDate;
      if (!(value && endDate && endDate < value)) delete next.endDate;
      return next;
    });
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setErrors((prev) => {
      if (!prev.endDate) return prev;
      if (!(startDate && value && value < startDate)) {
        const next = { ...prev };
        delete next.endDate;
        return next;
      }
      return prev;
    });
  };

  const handleCapacityChange = (value: string) => {
    setCapacity(value);
    setErrors((prev) => {
      if (!prev.capacity) return prev;
      const parsed = Number(value);
      if (value && !Number.isNaN(parsed) && parsed >= 1) {
        const next = { ...prev };
        delete next.capacity;
        return next;
      }
      return prev;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const params = new URLSearchParams({
      query,
      startDate,
      endDate,
      capacity,
    });

    router.push(`/venues?${params.toString()}`);
  };

  return (
    <form
      className={`sf-journal-bar ${isSwaying ? 'is-swaying' : ''}`}
      onSubmit={handleSubmit}
      onMouseEnter={handleMouseEnter}
      onAnimationEnd={() => setIsSwaying(false)}
    >
      <p className="sf-journal-title">Busca disponibilidad real</p>
      <p className="sf-journal-subtitle">
        Fecha e invitados son obligatorios para resultados relevantes
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] lg:items-end lg:gap-5">
        <div className="relative min-w-0">
          <Label htmlFor="homeQuery" className="sf-journal-label">
            <Search className="mr-1.5 inline h-3.5 w-3.5" />
            Buscar
          </Label>
          <Input
            id="homeQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Salon, zona o servicio"
            className={journalInputClass}
          />
        </div>

        <div className="relative min-w-0">
          <Label htmlFor="homeStartDate" className="sf-journal-label">
            <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
            Fecha inicio
          </Label>
          <Input
            id="homeStartDate"
            type="date"
            value={startDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            aria-invalid={Boolean(errors.startDate)}
            className={journalInputClass}
          />
          {errors.startDate ? <p className="sf-journal-error">{errors.startDate}</p> : null}
        </div>

        <div className="relative min-w-0">
          <Label htmlFor="homeEndDate" className="sf-journal-label">
            Fecha fin (opcional)
          </Label>
          <Input
            id="homeEndDate"
            type="date"
            value={endDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            aria-invalid={Boolean(errors.endDate)}
            className={journalInputClass}
          />
          {errors.endDate ? <p className="sf-journal-error">{errors.endDate}</p> : null}
        </div>

        <div className="relative min-w-0">
          <Label htmlFor="homeCapacity" className="sf-journal-label">
            <Users className="mr-1.5 inline h-3.5 w-3.5" />
            Invitados
          </Label>
          <Input
            id="homeCapacity"
            value={capacity}
            onChange={(event) => handleCapacityChange(event.target.value)}
            type="number"
            min="1"
            placeholder="100"
            aria-invalid={Boolean(errors.capacity)}
            className={journalInputClass}
          />
          {errors.capacity ? <p className="sf-journal-error">{errors.capacity}</p> : null}
        </div>

        <Button type="submit" size="xl" className="w-full lg:w-auto">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </form>
  );
};
