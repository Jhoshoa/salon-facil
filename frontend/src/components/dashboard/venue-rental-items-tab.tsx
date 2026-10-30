'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  createRentalItem,
  createRentalItemCategory,
  deleteRentalItem,
  getOwnerRentalItems,
  getRentalItemCategories,
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
import { VenueRentalItemCategoriesManager } from './venue-rental-item-categories-manager';
import type { Venue, VenueRentalItem } from '@/types/api';

interface VenueRentalItemsTabProps {
  venue: Venue;
}

interface FormValues {
  name: string;
  categoryId: string;
  description: string;
  pricePerUnit: string;
  unitLabel: string;
  stockQty: string;
  isActive: boolean;
}

interface FieldErrors {
  name?: string;
  categoryId?: string;
  pricePerUnit?: string;
  stockQty?: string;
}

const emptyForm: FormValues = {
  name: '',
  categoryId: '',
  description: '',
  pricePerUnit: '',
  unitLabel: 'unidad',
  stockQty: '',
  isActive: true,
};

const ALL_CATEGORIES = '__all__';
const NEW_CATEGORY = '__new__';

export const VenueRentalItemsTab = ({ venue }: VenueRentalItemsTabProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VenueRentalItem | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [itemToDelete, setItemToDelete] = useState<VenueRentalItem | null>(null);
  const [confirmRemovePhotoOpen, setConfirmRemovePhotoOpen] = useState(false);
  const [creatingCategoryInline, setCreatingCategoryInline] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');

  // Local preview of a newly picked (not-yet-uploaded) photo -- revoked whenever the file
  // changes or the component unmounts, so these object URLs don't leak.
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const query = useQuery({
    queryKey: ['venue-rental-items', venue.id],
    queryFn: () => getOwnerRentalItems(venue.id),
  });

  const categoriesQuery = useQuery({
    queryKey: ['venue-rental-item-categories', venue.id],
    queryFn: () => getRentalItemCategories(venue.id),
  });

  const categories = useMemo(
    () => [...(categoriesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [categoriesQuery.data],
  );

  const items = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [query.data],
  );

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== ALL_CATEGORIES && item.category.id !== categoryFilter) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: ['venue-rental-item-categories', venue.id] });
  // Category item-counts (shown in the categories manager, and used to gate deleting a category)
  // depend on which items exist, so creating/editing/deleting an item must also refresh them.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['venue-rental-items', venue.id] });
    invalidateCategories();
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createRentalItem(
        venue.id,
        {
          name: form.name.trim(),
          categoryId: form.categoryId,
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

  const createCategoryInlineMutation = useMutation({
    mutationFn: (name: string) => createRentalItemCategory(venue.id, { name }),
    onSuccess: (newCategory) => {
      invalidateCategories();
      setForm((prev) => ({ ...prev, categoryId: newCategory.id }));
      setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
      setCreatingCategoryInline(false);
      setInlineCategoryName('');
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear la categoria', { description: error.message });
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setRemovePhoto(false);
    setConfirmRemovePhotoOpen(false);
    setFieldErrors({});
    setCreatingCategoryInline(false);
    setDialogOpen(true);
  };

  const openEditDialog = (item: VenueRentalItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId: item.category.id,
      description: item.description ?? '',
      pricePerUnit: String(item.pricePerUnit),
      unitLabel: item.unitLabel,
      stockQty: item.stockQty !== null ? String(item.stockQty) : '',
      isActive: item.isActive,
    });
    setPhotoFile(null);
    setRemovePhoto(false);
    setConfirmRemovePhotoOpen(false);
    setFieldErrors({});
    setCreatingCategoryInline(false);
    setDialogOpen(true);
  };

  const pickPhoto = () => fileInputRef.current?.click();

  const handlePhotoFileChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) setRemovePhoto(false);
  };

  const handleCancelNewPhoto = () => {
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExistingPhoto = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setConfirmRemovePhotoOpen(false);
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === NEW_CATEGORY) {
      setCreatingCategoryInline(true);
      setInlineCategoryName('');
      return;
    }
    setForm((prev) => ({ ...prev, categoryId: value }));
    setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
  };

  const handleSubmit = () => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) {
      errors.name = 'El nombre es obligatorio.';
    }
    if (!form.categoryId) {
      errors.categoryId = 'Elige o crea una categoria.';
    }
    const price = Number(form.pricePerUnit);
    if (!form.pricePerUnit.trim() || Number.isNaN(price) || price < 0) {
      errors.pricePerUnit = 'Ingresa un precio valido (0 o mas).';
    }
    if (form.stockQty.trim()) {
      const stock = Number(form.stockQty);
      if (Number.isNaN(stock) || !Number.isInteger(stock) || stock < 0) {
        errors.stockQty = 'El stock debe ser un numero entero, 0 o mas.';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          name: form.name.trim(),
          categoryId: form.categoryId,
          description: form.description.trim() || null,
          pricePerUnit: price,
          unitLabel: form.unitLabel.trim() || emptyForm.unitLabel,
          stockQty: form.stockQty.trim() ? Number(form.stockQty) : null,
          isActive: form.isActive,
          removePhoto: !photoFile && removePhoto ? true : undefined,
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
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCategoriesDialogOpen(true)}
          >
            <Settings2 className="h-4 w-4" />
            Gestionar categorias
          </Button>
          <Button type="button" size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Agregar item
          </Button>
        </div>
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
              <option key={category.id} value={category.id}>
                {category.name}
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
                    {item.category.name} · {formatCurrency(item.pricePerUnit)} / {item.unitLabel}
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(item)}
                  >
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

          <p className="-mt-2 text-xs text-muted-foreground">
            Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
          </p>

          <div className="space-y-4">
            <div className="sf-form-group">
              <Label htmlFor="rental-item-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rental-item-name"
                placeholder="Mesa redonda para 10"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <p className="sf-form-error">{fieldErrors.name}</p> : null}
            </div>

            <div className="sf-form-group">
              <Label htmlFor="rental-item-category">
                Categoria <span className="text-destructive">*</span>
              </Label>
              {creatingCategoryInline ? (
                <div className="flex gap-2">
                  <Input
                    id="rental-item-category"
                    placeholder="Nombre de la categoria"
                    value={inlineCategoryName}
                    onChange={(event) => setInlineCategoryName(event.target.value)}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!inlineCategoryName.trim() || createCategoryInlineMutation.isPending}
                    onClick={() => createCategoryInlineMutation.mutate(inlineCategoryName.trim())}
                  >
                    {createCategoryInlineMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Crear categoria'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setCreatingCategoryInline(false)}
                    disabled={createCategoryInlineMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select
                  id="rental-item-category"
                  value={form.categoryId}
                  onChange={(event) => handleCategorySelectChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.categoryId)}
                >
                  <option value="">Selecciona una categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ Crear categoria nueva</option>
                </Select>
              )}
              {fieldErrors.categoryId ? (
                <p className="sf-form-error">{fieldErrors.categoryId}</p>
              ) : null}
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
                hidden
                onChange={(event) => handlePhotoFileChange(event.target.files?.[0] ?? null)}
              />

              {photoPreviewUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview,
                   * not an optimizable remote asset */}
                  <img
                    src={photoPreviewUrl}
                    alt=""
                    className="h-24 w-24 rounded-[var(--radius)] border object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={pickPhoto}>
                      <Pencil className="h-4 w-4" />
                      Cambiar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={handleCancelNewPhoto}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Quitar
                    </Button>
                  </div>
                </div>
              ) : editingItem?.photoUrl && !removePhoto ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius)] border">
                    <Image
                      src={editingItem.photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      loader={cloudinaryImageLoader}
                      sizes="96px"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={pickPhoto}>
                      <Pencil className="h-4 w-4" />
                      Cambiar foto
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRemovePhotoOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Eliminar foto
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pickPhoto}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-input text-muted-foreground transition-colors hover:bg-muted"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Agregar</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sf-form-group">
                <Label htmlFor="rental-item-price">
                  Precio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rental-item-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pricePerUnit}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, pricePerUnit: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, pricePerUnit: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.pricePerUnit)}
                />
                {fieldErrors.pricePerUnit ? (
                  <p className="sf-form-error">{fieldErrors.pricePerUnit}</p>
                ) : null}
              </div>
              <div className="sf-form-group">
                <Label htmlFor="rental-item-unit">Unidad (opcional)</Label>
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
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, stockQty: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, stockQty: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.stockQty)}
                />
                {fieldErrors.stockQty ? (
                  <p className="sf-form-error">{fieldErrors.stockQty}</p>
                ) : null}
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
            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
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

      <ConfirmDialog
        open={confirmRemovePhotoOpen}
        title="Eliminar foto"
        description="Esta accion no se puede deshacer una vez que guardes los cambios. La foto se eliminara del item."
        confirmLabel="Eliminar"
        onOpenChange={setConfirmRemovePhotoOpen}
        onConfirm={handleRemoveExistingPhoto}
      />

      <VenueRentalItemCategoriesManager
        venue={venue}
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />
    </div>
  );
};
