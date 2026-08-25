'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAdminSeasonalEvent,
  getAdminSeasonalEvents,
  updateAdminSeasonalEvent,
} from '@/lib/api/venues.api';
import { formatDate, formatDateInput } from '@/lib/formatters';
import type { SeasonalEvent } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';

interface SeasonalEventFormValues {
  name: string;
  startDate: string;
  endDate: string;
  note: string;
}

const emptyForm: SeasonalEventFormValues = {
  name: '',
  startDate: formatDateInput(),
  endDate: formatDateInput(),
  note: '',
};

export const SeasonalEventCatalogManager = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'catalog', 'seasonal-events'],
    queryFn: getAdminSeasonalEvents,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SeasonalEventFormValues>(emptyForm);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'catalog', 'seasonal-events'] });

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminSeasonalEvent({
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        note: form.note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Feriado/temporada creado');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof updateAdminSeasonalEvent>[1] }) =>
      updateAdminSeasonalEvent(variables.id, variables.data),
    onSuccess: () => {
      toast.success('Actualizado');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar', { description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: SeasonalEvent) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      startDate: item.startDate.slice(0, 10),
      endDate: item.endDate.slice(0, 10),
      note: item.note ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.warning('El nombre es obligatorio');
      return;
    }
    if (form.endDate < form.startDate) {
      toast.warning('La fecha de fin debe ser igual o posterior a la de inicio');
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          note: form.note.trim() || undefined,
        },
      });
      return;
    }

    createMutation.mutate();
  };

  const toggleActive = (item: SeasonalEvent) => {
    updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Los owners pueden usar estas fechas como punto de partida al crear precios por
          temporada — el precio siempre lo definen ellos, esto solo sugiere nombre y fechas.
        </p>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="No se pudo cargar el catalogo"
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.data && query.data.length === 0 ? (
        <EmptyState title="Sin elementos" description="Agrega el primero con el boton de arriba." />
      ) : null}

      {query.data && query.data.length > 0 ? (
        <div className="sf-card divide-y overflow-hidden">
          {query.data.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  {!item.isActive ? <Badge variant="secondary">Inactivo</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                  {item.note ? ` · ${item.note}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant={item.isActive ? 'outline' : 'default'}
                  onClick={() => toggleActive(item)}
                  disabled={updateMutation.isPending}
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar feriado/temporada' : 'Nuevo feriado/temporada'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="sf-form-group">
              <Label htmlFor="event-name">Nombre</Label>
              <Input
                id="event-name"
                placeholder="Carnaval 2027"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sf-form-group">
                <Label htmlFor="event-start">Desde</Label>
                <Input
                  id="event-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="event-end">Hasta</Label>
                <Input
                  id="event-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="sf-form-group">
              <Label htmlFor="event-note">Nota (opcional)</Label>
              <textarea
                id="event-note"
                rows={2}
                className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                placeholder="Alta demanda en salones de fiesta"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
