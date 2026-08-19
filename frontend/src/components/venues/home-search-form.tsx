'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Search, Users } from 'lucide-react';
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
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [errors, setErrors] = useState<SearchErrors>({});

  const validate = () => {
    const parsedCapacity = Number(capacity);
    const nextErrors: SearchErrors = {};

    if (!startDate) nextErrors.startDate = 'La fecha es obligatoria.';
    if (!capacity || Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      nextErrors.capacity = 'La cantidad de personas es obligatoria.';
    }
    if (rangeEnabled && !endDate) nextErrors.endDate = 'La fecha final es obligatoria.';
    if (rangeEnabled && startDate && endDate && endDate < startDate) {
      nextErrors.endDate = 'La fecha final no puede ser anterior a la inicial.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const params = new URLSearchParams({
      query,
      startDate,
      endDate: rangeEnabled ? endDate : '',
      capacity,
    });

    router.push(`/venues?${params.toString()}`);
  };

  const handleRangeChange = (checked: boolean) => {
    setRangeEnabled(checked);
    if (!checked) setEndDate('');
  };

  const canSearch =
    Boolean(startDate) &&
    Boolean(capacity) &&
    Number(capacity) > 0 &&
    (!rangeEnabled || (Boolean(endDate) && endDate >= startDate));

  return (
    <form
      className="mt-8 grid gap-3 rounded-md border bg-card p-4 shadow-sm lg:grid-cols-[1fr_180px_180px_160px_auto]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="homeQuery">Buscar</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="homeQuery"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Salon, zona o servicio"
            className="h-11 pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeStartDate">Fecha inicio</Label>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="homeStartDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 pl-9"
          />
        </div>
        {errors.startDate ? <p className="text-sm text-destructive">{errors.startDate}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="homeEndDate">Fecha fin</Label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={rangeEnabled}
              onChange={(event) => handleRangeChange(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Rango
          </label>
        </div>
        <Input
          id="homeEndDate"
          type="date"
          value={endDate}
          disabled={!rangeEnabled}
          onChange={(event) => setEndDate(event.target.value)}
          className="h-11"
        />
        {errors.endDate ? <p className="text-sm text-destructive">{errors.endDate}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeCapacity">Invitados</Label>
        <div className="relative">
          <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="homeCapacity"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            type="number"
            min="1"
            placeholder="100"
            className="h-11 pl-9"
          />
        </div>
        {errors.capacity ? <p className="text-sm text-destructive">{errors.capacity}</p> : null}
      </div>

      <div className="flex items-end">
        <Button type="submit" className="h-11 w-full" disabled={!canSearch}>
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </form>
  );
};
