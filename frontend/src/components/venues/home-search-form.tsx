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
    <form className="sf-search-bar" onSubmit={handleSubmit}>
      <div className="sf-search-grid">
        <div className="sf-search-field">
          <Label htmlFor="homeQuery" className="sf-field-label">
            <Search className="mr-1.5 inline h-3.5 w-3.5" />
            Buscar
          </Label>
          <Input
            id="homeQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Salon, zona o servicio"
            className="sf-field-input"
          />
        </div>

        <div className="sf-search-field" data-error={Boolean(errors.startDate)}>
          <Label htmlFor="homeStartDate" className="sf-field-label">
            <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
            Fecha inicio
          </Label>
          <Input
            id="homeStartDate"
            type="date"
            value={startDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            aria-invalid={Boolean(errors.startDate)}
            className="sf-field-input"
          />
          {errors.startDate ? <p className="sf-field-popover">{errors.startDate}</p> : null}
        </div>

        <div className="sf-search-field">
          <Label htmlFor="homeEndDate" className="sf-field-label">
            Fecha fin (opcional)
          </Label>
          <Input
            id="homeEndDate"
            type="date"
            value={endDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            aria-invalid={Boolean(errors.endDate)}
            className="sf-field-input"
          />
          {errors.endDate ? <p className="sf-field-popover">{errors.endDate}</p> : null}
        </div>

        <div className="sf-search-field" data-error={Boolean(errors.capacity)}>
          <Label htmlFor="homeCapacity" className="sf-field-label">
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
            className="sf-field-input"
          />
          {errors.capacity ? <p className="sf-field-popover">{errors.capacity}</p> : null}
        </div>

        <div className="sf-search-submit">
          <Button type="submit" size="xl" className="h-full w-full md:w-auto">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>
    </form>
  );
};
