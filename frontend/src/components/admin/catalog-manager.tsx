'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
import type { AmenityCategory } from '@/types/api';

interface CatalogRow {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  sortOrder?: number;
  isActive?: boolean;
  category?: AmenityCategory;
}

interface CatalogItemFormValues {
  key: string;
  name: string;
  icon: string;
  sortOrder: string;
  category: AmenityCategory | '';
}

const emptyForm: CatalogItemFormValues = {
  key: '',
  name: '',
  icon: '',
  sortOrder: '0',
  category: '',
};

const categoryLabels: Record<AmenityCategory, string> = {
  FACILITY: 'Instalaciones',
  COMFORT: 'Confort',
  AUDIO_VISUAL: 'Audio y video',
  CATERING_DRINKS: 'Catering y bebidas',
  PARKING: 'Parqueo',
  ACCESSIBILITY: 'Accesibilidad',
  SAFETY: 'Seguridad',
  SERVICES: 'Servicios',
};

interface CatalogManagerProps {
  title: string;
  description: string;
  queryKey: string;
  listFn: () => Promise<CatalogRow[]>;
  createFn: (data: {
    key: string;
    name: string;
    icon?: string;
    sortOrder?: number;
    category?: AmenityCategory;
  }) => Promise<CatalogRow>;
  updateFn: (
    id: string,
    data: {
      name?: string;
      icon?: string;
      sortOrder?: number;
      isActive?: boolean;
      category?: AmenityCategory;
    },
  ) => Promise<CatalogRow>;
  withCategory?: boolean;
}

export const CatalogManager = ({
  title,
  description,
  queryKey,
  listFn,
  createFn,
  updateFn,
  withCategory = false,
}: CatalogManagerProps) => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'catalog', queryKey], queryFn: listFn });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogItemFormValues>(emptyForm);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'catalog', queryKey] });

  const createMutation = useMutation({
    mutationFn: () =>
      createFn({
        key: form.key.trim(),
        name: form.name.trim(),
        icon: form.icon.trim() || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
        category: withCategory ? (form.category as AmenityCategory) : undefined,
      }),
    onSuccess: () => {
      toast.success('Elemento creado');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear el elemento', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof updateFn>[1] }) =>
      updateFn(variables.id, variables.data),
    onSuccess: () => {
      toast.success('Elemento actualizado');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el elemento', { description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: CatalogRow) => {
    setEditingId(item.id);
    setForm({
      key: item.key,
      name: item.name,
      icon: item.icon ?? '',
      sortOrder: String(item.sortOrder ?? 0),
      category: item.category ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.warning('El nombre es obligatorio');
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: form.name.trim(),
          icon: form.icon.trim() || undefined,
          sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
          category: withCategory ? (form.category as AmenityCategory) : undefined,
        },
      });
      return;
    }

    if (!form.key.trim()) {
      toast.warning('La clave (key) es obligatoria');
      return;
    }

    if (withCategory && !form.category) {
      toast.warning('Selecciona una categoria');
      return;
    }

    createMutation.mutate();
  };

  const toggleActive = (item: CatalogRow) => {
    updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
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
        <ErrorState title={`No se pudo cargar ${title.toLowerCase()}`} onRetry={() => query.refetch()} />
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
                  {item.category ? (
                    <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.key} · orden {item.sortOrder ?? 0}
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
            <DialogTitle>{editingId ? 'Editar elemento' : 'Nuevo elemento'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editingId ? (
              <div className="sf-form-group">
                <Label htmlFor="catalog-key">Clave (key)</Label>
                <Input
                  id="catalog-key"
                  placeholder="EJ_GRADUATION_PARTY"
                  value={form.key}
                  onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                />
              </div>
            ) : null}

            <div className="sf-form-group">
              <Label htmlFor="catalog-name">Nombre visible</Label>
              <Input
                id="catalog-name"
                placeholder="Fiesta de graduacion"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            {withCategory ? (
              <div className="sf-form-group">
                <Label htmlFor="catalog-category">Categoria</Label>
                <Select
                  id="catalog-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value as AmenityCategory,
                    }))
                  }
                >
                  <option value="">Selecciona una categoria</option>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sf-form-group">
                <Label htmlFor="catalog-icon">Icono (opcional)</Label>
                <Input
                  id="catalog-icon"
                  placeholder="Sparkles"
                  value={form.icon}
                  onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="catalog-sort">Orden</Label>
                <Input
                  id="catalog-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                />
              </div>
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
