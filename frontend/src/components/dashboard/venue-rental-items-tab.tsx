'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ImagePlus, Loader2, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
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
import { CURRENCY, formatCurrency } from '@/lib/formatters';
import {
  chargeBasisLabels,
  groupRentalItemsByCategory,
  reorderRentalItemsWithinCategory,
} from '@/lib/rental-items';
import { cn } from '@/lib/utils';
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
import type { RentalItemChargeBasis, Venue, VenueRentalItem } from '@/types/api';

interface SortableRentalItemRowProps {
  item: VenueRentalItem;
  showChargeBasis: boolean;
  dragDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const SortableRentalItemRow = ({
  item,
  showChargeBasis,
  dragDisabled,
  onEdit,
  onDelete,
}: SortableRentalItemRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: dragDisabled,
  });
  // Older items can be missing it. Clients can't add them to a quote until the owner completes it.
  const needsStock = !item.isIncluded && item.stockQty === null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-wrap items-center gap-4 bg-background p-4',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Arrastrar ${item.name} para reordenar`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
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
          {needsStock ? <Badge variant="destructive">Falta cantidad disponible</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.pricePerUnit === null
            ? 'Incluido con el local'
            : `${formatCurrency(item.pricePerUnit)} / ${item.unitLabel}${
                showChargeBasis ? ` · ${chargeBasisLabels[item.chargeBasis]}` : ''
              }`}
          {item.stockQty !== null ? ` · stock ${item.stockQty}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          title="Eliminar item"
          aria-label="Eliminar item"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

interface VenueRentalItemsTabProps {
  venue: Venue;
}

interface FormValues {
  name: string;
  categoryId: string;
  description: string;
  isIncluded: boolean;
  chargeBasis: RentalItemChargeBasis;
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
  isIncluded: false,
  chargeBasis: 'PER_DAY',
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
  // Holds the just-dragged order until the refetch lands, so the list doesn't snap back meanwhile.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const items = useMemo(() => {
    const sorted = [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!dragOrder) return sorted;
    const byId = new Map(sorted.map((item) => [item.id, item]));
    return dragOrder.map((id) => byId.get(id)).filter((item): item is VenueRentalItem => !!item);
  }, [query.data, dragOrder]);

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
          isIncluded: form.isIncluded,
          chargeBasis: form.isIncluded ? undefined : form.chargeBasis,
          pricePerUnit: form.isIncluded ? undefined : Number(form.pricePerUnit),
          unitLabel: form.isIncluded ? undefined : form.unitLabel.trim() || undefined,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['venue-rental-items', venue.id] });
      setDragOrder(null);
    },
    onError: (error: { message?: string }) => {
      setDragOrder(null);
      // The list may be stale (an item added from another tab), which is exactly what gets a
      // reorder rejected -- refetch so the next attempt sends the current set.
      queryClient.invalidateQueries({ queryKey: ['venue-rental-items', venue.id] });
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
      isIncluded: item.isIncluded,
      chargeBasis: item.chargeBasis,
      pricePerUnit: item.pricePerUnit !== null ? String(item.pricePerUnit) : '',
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
    if (!form.isIncluded && (!form.pricePerUnit.trim() || Number.isNaN(price) || price < 0)) {
      errors.pricePerUnit = 'Ingresa un precio valido (0 o mas).';
    } else if (!form.isIncluded && Math.round(price * 100) / 100 !== price) {
      errors.pricePerUnit = 'El precio puede tener hasta 2 decimales.';
    }
    if (!form.isIncluded && !form.stockQty.trim()) {
      errors.stockQty = 'Indica cuantos tienes disponibles.';
    } else if (form.stockQty.trim()) {
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
          isIncluded: form.isIncluded,
          chargeBasis: form.isIncluded ? undefined : form.chargeBasis,
          pricePerUnit: form.isIncluded ? undefined : price,
          unitLabel: form.isIncluded ? undefined : form.unitLabel.trim() || emptyForm.unitLabel,
          stockQty: form.stockQty.trim() ? Number(form.stockQty) : null,
          isActive: form.isActive,
          removePhoto: !photoFile && removePhoto ? true : undefined,
        },
      });
      return;
    }

    createMutation.mutate();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const order = reorderRentalItemsWithinCategory(items, String(active.id), String(over.id));
    if (!order) return;
    setDragOrder(order);
    reorderMutation.mutate(order);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Catalogo de alquiler</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Items que ofreces (vajilla, mobiliario, decoracion), incluidos con el local o con precio
            aparte, y su stock informativo. El visitante los ve en la ficha publica y puede agregar
            a su solicitud los que se cobran aparte. Tu confirmas la disponibilidad al revisarla.
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
        <div className="space-y-5">
          {groupRentalItemsByCategory(filteredItems).map((group) => (
            <div key={group.category.id}>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.category.name}
              </h4>
              {/* One context per category: an item can't be dragged out of its own. */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={group.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="sf-card divide-y overflow-hidden">
                    {group.items.map((item) => (
                      <SortableRentalItemRow
                        key={item.id}
                        item={item}
                        showChargeBasis={venue.allowsMultipleDays}
                        dragDisabled={reorderMutation.isPending}
                        onEdit={() => openEditDialog(item)}
                        onDelete={() => setItemToDelete(item)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ))}
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

            <fieldset className="sf-form-group">
              <legend className="mb-2 text-sm font-medium leading-none">Cobro</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rental-item-pricing"
                    checked={!form.isIncluded}
                    onChange={() => setForm((prev) => ({ ...prev, isIncluded: false }))}
                  />
                  Se cobra aparte
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rental-item-pricing"
                    checked={form.isIncluded}
                    onChange={() => {
                      setForm((prev) => ({ ...prev, isIncluded: true }));
                      setFieldErrors((prev) => ({ ...prev, pricePerUnit: undefined }));
                    }}
                  />
                  Incluido con el local
                </label>
              </div>
            </fieldset>

            {!form.isIncluded && venue.allowsMultipleDays ? (
              <fieldset className="sf-form-group">
                <legend className="mb-2 text-sm font-medium leading-none">
                  En reservas de varios dias
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="rental-item-charge-basis"
                      checked={form.chargeBasis === 'PER_DAY'}
                      onChange={() => setForm((prev) => ({ ...prev, chargeBasis: 'PER_DAY' }))}
                    />
                    Cobrar por dia
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="rental-item-charge-basis"
                      checked={form.chargeBasis === 'PER_EVENT'}
                      onChange={() => setForm((prev) => ({ ...prev, chargeBasis: 'PER_EVENT' }))}
                    />
                    Cobrar por evento completo
                  </label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.chargeBasis === 'PER_DAY'
                    ? 'El precio se multiplica por los dias de la reserva.'
                    : 'El precio se cobra una sola vez, sin importar los dias.'}
                </p>
              </fieldset>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              {!form.isIncluded ? (
                <>
                  <div className="sf-form-group">
                    <Label htmlFor="rental-item-price">
                      Precio <span className="sr-only">en {CURRENCY.symbol}</span>{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                      >
                        {CURRENCY.symbol}
                      </span>
                      <Input
                        id="rental-item-price"
                        type="number"
                        min={0}
                        step="0.01"
                        className="pl-9"
                        value={form.pricePerUnit}
                        onChange={(event) => {
                          setForm((prev) => ({ ...prev, pricePerUnit: event.target.value }));
                          setFieldErrors((prev) => ({ ...prev, pricePerUnit: undefined }));
                        }}
                        aria-invalid={Boolean(fieldErrors.pricePerUnit)}
                      />
                    </div>
                    {fieldErrors.pricePerUnit ? (
                      <p className="sf-form-error">{fieldErrors.pricePerUnit}</p>
                    ) : null}
                  </div>
                  <div className="sf-form-group">
                    <Label htmlFor="rental-item-unit">Unidad (opcional)</Label>
                    <Input
                      id="rental-item-unit"
                      placeholder="unidad, juego, modulo"
                      value={form.unitLabel}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, unitLabel: event.target.value }))
                      }
                    />
                  </div>
                </>
              ) : null}
              <div className="sf-form-group">
                <Label htmlFor="rental-item-stock">
                  {form.isIncluded ? (
                    'Stock (opcional)'
                  ) : (
                    <>
                      Cantidad <span className="text-destructive">*</span>
                    </>
                  )}
                </Label>
                <Input
                  id="rental-item-stock"
                  placeholder={form.isIncluded ? undefined : 'Disponibles'}
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
