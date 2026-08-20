'use client';

import { FormEvent, useState } from 'react';
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

export const HomeSearchForm = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState<SearchErrors>({});

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
      className="grid items-start gap-3 lg:grid-cols-[minmax(360px,2fr)_190px_190px_150px_140px]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1.5">
        <Label htmlFor="homeQuery" className="flex h-5 items-center">
          Buscar
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="homeQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Salon, zona o servicio"
            className="sf-search-field pl-10 text-base"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="homeStartDate" className="flex h-5 items-center">
          Fecha inicio
        </Label>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="homeStartDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={Boolean(errors.startDate)}
            className="sf-search-field pl-10"
          />
        </div>
        {errors.startDate ? <p className="text-sm text-destructive">{errors.startDate}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="homeEndDate" className="flex h-5 items-center">
          Fecha fin opcional
        </Label>
        <Input
          id="homeEndDate"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          aria-invalid={Boolean(errors.endDate)}
          className="sf-search-field"
        />
        {errors.endDate ? <p className="text-sm text-destructive">{errors.endDate}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="homeCapacity" className="flex h-5 items-center">
          Invitados
        </Label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="homeCapacity"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            type="number"
            min="1"
            placeholder="100"
            aria-invalid={Boolean(errors.capacity)}
            className="sf-search-field pl-10"
          />
        </div>
        {errors.capacity ? <p className="text-sm text-destructive">{errors.capacity}</p> : null}
      </div>

      <div className="space-y-1.5">
        <span className="flex h-5 items-center text-sm font-medium text-transparent">Buscar</span>
        <Button type="submit" className="sf-action h-14 w-full px-5">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </form>
  );
};
