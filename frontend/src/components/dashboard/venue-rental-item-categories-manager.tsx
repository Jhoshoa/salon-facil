'use client';

import { useMemo, useState } from 'react';
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRentalItemCategory,
  deleteRentalItemCategory,
  getRentalItemCategories,
  reorderRentalItemCategories,
  updateRentalItemCategory,
} from '@/lib/api/venues.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import type { Venue, VenueRentalItemCategory } from '@/types/api';

interface VenueRentalItemCategoriesManagerProps {
  venue: Venue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Atajos para que un local nuevo no empiece de cero -- no es un catalogo global en la base de
// datos, solo sugerencias de un click en el frontend. El dueño puede ignorarlas y escribir las
// suyas sin depender de que nadie las registre primero.
const SUGGESTED_CATEGORIES = [
  'Mobiliario',
  'Decoracion',
  'Vajilla y Cristaleria',
  'Manteleria',
  'Audio y Video',
  'Iluminacion',
  'Transporte',
  'Catering',
];

interface SortableCategoryRowProps {
  category: VenueRentalItemCategory;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  isRenaming: boolean;
}

const SortableCategoryRow = ({
  category,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isRenaming,
}: SortableCategoryRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 bg-background p-3',
        isDragging && 'relative z-10 shadow-md',
      )}
    >
      {isEditing ? (
        <>
          <Input
            value={editingName}
            onChange={(event) => onEditingNameChange(event.target.value)}
            className="h-9"
            autoFocus
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onSaveEdit}
            disabled={isRenaming}
            aria-label="Guardar nombre"
          >
            {isRenaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onCancelEdit}
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{category.name}</p>
            <p className="text-xs text-muted-foreground">
              {category.itemCount} item{category.itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onStartEdit}
            aria-label="Renombrar categoria"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            disabled={category.itemCount > 0}
            title={
              category.itemCount > 0
                ? `Tiene ${category.itemCount} item${category.itemCount === 1 ? '' : 's'} -- movelos o borralos primero`
                : 'Eliminar categoria'
            }
            aria-label="Eliminar categoria"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </>
      )}
    </div>
  );
};

export const VenueRentalItemCategoriesManager = ({
  venue,
  open,
  onOpenChange,
}: VenueRentalItemCategoriesManagerProps) => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<VenueRentalItemCategory | null>(null);
  // Optimistic order applied right away on drop, cleared once the server confirms the same
  // order -- otherwise the list would snap back to the old order until the refetch lands.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const query = useQuery({
    queryKey: ['venue-rental-item-categories', venue.id],
    queryFn: () => getRentalItemCategories(venue.id),
    enabled: open,
  });

  const sortedCategories = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [query.data],
  );

  const categories = useMemo(() => {
    if (!dragOrder) return sortedCategories;
    const byId = new Map(sortedCategories.map((c) => [c.id, c]));
    return dragOrder.map((id) => byId.get(id)).filter((c): c is VenueRentalItemCategory => !!c);
  }, [sortedCategories, dragOrder]);

  const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
  const suggestions = SUGGESTED_CATEGORIES.filter((name) => !existingNames.has(name.toLowerCase()));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['venue-rental-item-categories', venue.id] });

  const createMutation = useMutation({
    mutationFn: (name: string) => createRentalItemCategory(venue.id, { name }),
    onSuccess: () => {
      setNewName('');
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo crear la categoria', { description: error.message });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (variables: { id: string; name: string }) =>
      updateRentalItemCategory(venue.id, variables.id, { name: variables.name }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo renombrar la categoria', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteRentalItemCategory(venue.id, categoryId),
    onSuccess: () => {
      toast.success('Categoria eliminada');
      setCategoryToDelete(null);
      invalidate();
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudo eliminar la categoria', { description: error.message });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderRentalItemCategories(venue.id, order),
    onSuccess: async () => {
      await invalidate();
      setDragOrder(null);
    },
    onError: (error: { message?: string }) => {
      setDragOrder(null);
      toast.error('No se pudo actualizar el orden', { description: error.message });
    },
  });

  const handleCreate = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.has(trimmed.toLowerCase())) {
      toast.warning('Ya existe una categoria con ese nombre');
      return;
    }
    createMutation.mutate(trimmed);
  };

  const startEditing = (category: VenueRentalItemCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const saveRename = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.warning('El nombre no puede quedar vacio');
      return;
    }
    renameMutation.mutate({ id: editingId, name: trimmed });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(categories, oldIndex, newIndex).map((c) => c.id);
    setDragOrder(newOrder);
    reorderMutation.mutate(newOrder);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorias del catalogo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Organiza tus items de alquiler en categorias propias (no afecta a otros locales). No
              puedes borrar una categoria mientras tenga items -- muevelos o borralos primero.
            </p>

            {query.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            ) : null}

            {query.isError ? (
              <ErrorState
                title="No se pudieron cargar las categorias"
                onRetry={() => query.refetch()}
              />
            ) : null}

            {query.data && categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavia no tienes categorias.</p>
            ) : null}

            {categories.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="sf-card divide-y overflow-hidden">
                    {categories.map((category) => (
                      <SortableCategoryRow
                        key={category.id}
                        category={category}
                        isEditing={editingId === category.id}
                        editingName={editingName}
                        onEditingNameChange={setEditingName}
                        onStartEdit={() => startEditing(category)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={saveRename}
                        onDelete={() => setCategoryToDelete(category)}
                        isRenaming={renameMutation.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : null}

            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoria..."
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreate(newName);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleCreate(newName)}
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Crear
              </Button>
            </div>

            {suggestions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Sugerencias:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleCreate(name)}
                      disabled={createMutation.isPending}
                      className="rounded-full border border-dashed border-input px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={categoryToDelete !== null}
        title="Eliminar categoria"
        description={`Esta accion no se puede deshacer. "${categoryToDelete?.name ?? ''}" se eliminara del catalogo.`}
        confirmLabel="Eliminar"
        isLoading={deleteMutation.isPending}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCategoryToDelete(null);
        }}
        onConfirm={() => {
          if (categoryToDelete) deleteMutation.mutate(categoryToDelete.id);
        }}
      />
    </>
  );
};
