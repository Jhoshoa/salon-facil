'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  createRentalItem,
  deleteRentalItem,
  getOwnerRentalItems,
  reorderRentalItems,
  updateRentalItem,
} from '@/lib/api/venues.api';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { formatCurrency } from '@/lib/formatters';
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import type { Venue, VenueRentalItem } from '@/types/api';

interface VenueRentalItemsTabProps {
  venue: Venue;
}

interface FormValues {
  name: string;
  category: string;
  description: string;
  pricePerUnit: string;
  unitLabel: string;
  stockQty: string;
  isActive: boolean;
}

const emptyForm: FormValues = {
  name: '',
  category: '',
  description: '',
  pricePerUnit: '',
  unitLabel: 'unidad',
  stockQty: '',
  isActive: true,
};

const ALL_CATEGORIES = '__all__';

export const VenueRentalItemsTab = ({ venue }: VenueRentalItemsTabProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VenueRentalItem | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [itemToDelete, setItemToDelete] = useState<VenueRentalItem | null>(null);

  const query = useQuery({
    queryKey: ['venue-rental-items', venue.id],
    queryFn: () => getOwnerRentalItems(venue.id),
  });

  const items = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [query.data],
  );

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== ALL_CATEGORIES && item.category !== categoryFilter) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['venue-rental-items', venue.id] });

  const createMutation = useMutation({
    mutationFn: () =>
      createRentalItem(
        venue.id,
        {
          name: form.name.trim(),
          category: form.category.trim(),
          description: form.description.trim() || undefined,
          pricePerUnit: Number(form.pricePerUnit),
          unitLabel: form.unitLabel.trim() || undefined,
          stockQty: form.stockQty.trim() ? Number(form.stockQty) : undefined,
        },
        photoFile ?? undefined,
      ),
    onSuccess: () => {
      toast.success('Item agregado al catalogo');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo agregar el item', { description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof updateRentalItem>[2] }) =>
      updateRentalItem(venue.id, variables.id, variables.data, photoFile ?? undefined),
    onSuccess: () => {
      toast.success('Item actualizado');
      setDialogOpen(false);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el item', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteRentalItem(venue.id, itemId),
    onSuccess: () => {
      toast.success('Item eliminado');
      setItemToDelete(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar el item', { description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderRentalItems(venue.id, order),
    onSuccess: invalidate,
    onError: (error: { message?: string }) => {
      toast.error('No se pudo actualizar el orden', { description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: VenueRentalItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description ?? '',
      pricePerUnit: String(item.pricePerUnit),
      unitLabel: item.unitLabel,
      stockQty: item.stockQty !== null ? String(item.stockQty) : '',
      isActive: item.isActive,
    });
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.warning('El nombre es obligatorio');
      return;
    }
    if (!form.category.trim()) {
      toast.warning('La categoria es obligatoria');
      return;
    }
    if (!form.pricePerUnit.trim() || Number.isNaN(Number(form.pricePerUnit))) {
      toast.warning('El precio es obligatorio');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          name: form.name.trim(),
          category: form.category.trim(),
          description: form.description.trim() || undefined,
          pricePerUnit: Number(form.pricePerUnit),
          unitLabel: form.unitLabel.trim() || undefined,
          stockQty: form.stockQty.trim() ? Number(form.stockQty) : undefined,
          isActive: form.isActive,
        },
      });
      return;
    }

    createMutation.mutate();
  };

  const move = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderMutation.mutate(next.map((item) => item.id));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Catalogo de alquiler</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Items que ofreces por separado (vajilla, mobiliario, decoracion) con precio y stock
            informativo. El visitante los ve en la ficha publica y te contacta por WhatsApp para
            pedirlos.
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Agregar item
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-auto"
          >
            <option value={ALL_CATEGORIES}>Todas las categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState title="No se pudo cargar el catalogo" onRetry={() => query.refetch()} />
      ) : null}

      {query.data && items.length === 0 ? (
        <EmptyState
          title="Sin items todavia"
          description="Agrega mobiliario, vajilla o decoracion que ofrezcas aparte del local."
        />
      ) : null}

      {query.data && items.length > 0 && filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningun item coincide con el filtro o la busqueda.
        </p>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="sf-card divide-y overflow-hidden">
          {filteredItems.map((item) => {
            const index = items.findIndex((candidate) => candidate.id === item.id);
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      loader={cloudinaryImageLoader}
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {!item.isActive ? <Badge variant="secondary">Inactivo</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.category} · {formatCurrency(item.pricePerUnit)} / {item.unitLabel}
                    {item.stockQty !== null ? ` · stock ${item.stockQty}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || reorderMutation.isPending}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1 || reorderMutation.isPending}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setItemToDelete(item)}
                    title="Eliminar item"
                    aria-label="Eliminar item"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar item' : 'Nuevo item'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="sf-form-group">
              <Label htmlFor="rental-item-name">Nombre</Label>
              <Input
                id="rental-item-name"
                placeholder="Mesa redonda para 10"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>

            <div className="sf-form-group">
              <Label htmlFor="rental-item-category">Categoria</Label>
              <Input
                id="rental-item-category"
                list="rental-item-categories"
                placeholder="Mobiliario"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <datalist id="rental-item-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div className="sf-form-group">
              <Label htmlFor="rental-item-description">Descripcion (opcional)</Label>
              <textarea
                id="rental-item-description"
                rows={3}
                className="flex w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="sf-form-group">
              <Label htmlFor="rental-item-photo">Foto (opcional)</Label>
              <input
                ref={fileInputRef}
                id="rental-item-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                className="text-sm"
              />
              {editingItem?.photoUrl && !photoFile ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <ImagePlus className="h-3 w-3" />
                  Ya tiene foto -- elige una nueva solo si quieres remplazarla.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sf-form-group">
                <Label htmlFor="rental-item-price">Precio</Label>
                <Input
                  id="rental-item-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePerUnit}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pricePerUnit: event.target.value }))
                  }
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="rental-item-unit">Unidad</Label>
                <Input
                  id="rental-item-unit"
                  placeholder="unidad"
                  value={form.unitLabel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unitLabel: event.target.value }))
                  }
                />
              </div>
              <div className="sf-form-group">
                <Label htmlFor="rental-item-stock">Stock (opcional)</Label>
                <Input
                  id="rental-item-stock"
                  type="number"
                  min={0}
                  value={form.stockQty}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, stockQty: event.target.value }))
                  }
                />
              </div>
            </div>

            {editingItem ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Visible en la ficha publica
              </label>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingItem ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={itemToDelete !== null}
        title="Eliminar item"
        description="Esta accion no se puede deshacer. El item se eliminara del catalogo."
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
        onConfirm={() => {
          if (itemToDelete) deleteMutation.mutate(itemToDelete.id);
        }}
      />
    </div>
  );
};
