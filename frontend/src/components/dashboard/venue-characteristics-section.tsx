'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { amenityCategoryLabels } from '@/components/venues/venue-filter-labels';
import { getAmenitiesCatalog, updateVenueFeatures } from '@/lib/api/venues.api';
import { cn } from '@/lib/utils';
import {
  MAX_CUSTOM_FEATURES,
  MAX_CUSTOM_FEATURE_LENGTH,
  MIN_CUSTOM_FEATURE_LENGTH,
  normalizeFeatureName,
} from '@/lib/venue-features';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SubmitButton } from '@/components/shared/submit-button';
import type { AmenityCategory, Venue, VenueCustomFeatureInput } from '@/types/api';

interface VenueCharacteristicsSectionProps {
  venue: Venue;
}

const categories = Object.keys(amenityCategoryLabels) as AmenityCategory[];

const chipClass =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium';

export const VenueCharacteristicsSection = ({ venue }: VenueCharacteristicsSectionProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [customFeatures, setCustomFeatures] = useState<VenueCustomFeatureInput[]>([]);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<AmenityCategory>('FACILITY');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['venue-catalog', 'amenities'],
    queryFn: getAmenitiesCatalog,
    enabled: dialogOpen,
  });

  const amenityByNormalizedName = useMemo(
    () =>
      new Map(
        Object.values(catalogQuery.data ?? {})
          .flat()
          .map((amenity) => [normalizeFeatureName(amenity.name), amenity]),
      ),
    [catalogQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: () => updateVenueFeatures(venue.id, { amenityIds, customFeatures }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['owner-venue', venue.id] });
      toast.success('Caracteristicas guardadas');
      setDialogOpen(false);
    },
    onError: (error: { message?: string }) => {
      toast.error('No se pudieron guardar las caracteristicas', { description: error.message });
    },
  });

  const openDialog = () => {
    setAmenityIds((venue.amenities ?? []).map((item) => item.amenity.id));
    setCustomFeatures(
      (venue.customFeatures ?? []).map(({ name, category }) => ({ name, category })),
    );
    setNewName('');
    setNewCategory('FACILITY');
    setMessage(null);
    setDialogOpen(true);
  };

  const toggleAmenity = (id: string) => {
    setAmenityIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const addCustomFeature = () => {
    const name = newName.trim();
    const normalized = normalizeFeatureName(name);

    if (name.length < MIN_CUSTOM_FEATURE_LENGTH || name.length > MAX_CUSTOM_FEATURE_LENGTH) {
      setMessage({
        text: `Escribe entre ${MIN_CUSTOM_FEATURE_LENGTH} y ${MAX_CUSTOM_FEATURE_LENGTH} caracteres.`,
        isError: true,
      });
      return;
    }

    // One from the shared list is worth more: it's the only kind the search can filter by.
    const existingAmenity = amenityByNormalizedName.get(normalized);
    if (existingAmenity) {
      setAmenityIds((current) =>
        current.includes(existingAmenity.id) ? current : [...current, existingAmenity.id],
      );
      setNewName('');
      setMessage({
        text: `"${existingAmenity.name}" ya esta en la lista: la marcamos.`,
        isError: false,
      });
      return;
    }

    if (customFeatures.some((feature) => normalizeFeatureName(feature.name) === normalized)) {
      setMessage({ text: 'Esa caracteristica ya esta agregada.', isError: true });
      return;
    }
    if (customFeatures.length >= MAX_CUSTOM_FEATURES) {
      setMessage({ text: `Puedes agregar hasta ${MAX_CUSTOM_FEATURES}.`, isError: true });
      return;
    }

    setCustomFeatures((current) => [...current, { name, category: newCategory }]);
    setNewName('');
    setMessage(null);
  };

  const savedGroups = categories
    .map((category) => ({
      category,
      names: [
        ...(venue.amenities ?? [])
          .filter((item) => item.amenity.category === category)
          .map((item) => item.amenity.name),
        ...(venue.customFeatures ?? [])
          .filter((feature) => feature.category === category)
          .map((feature) => feature.name),
      ],
    }))
    .filter((group) => group.names.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Caracteristicas del local</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Lo que tiene tu local. Ayuda a que te encuentren y se muestra como incluido en tu ficha.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={openDialog}>
          {savedGroups.length > 0 ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {savedGroups.length > 0 ? 'Editar' : 'Agregar'}
        </Button>
      </div>

      {savedGroups.length > 0 ? (
        <dl className="space-y-2">
          {savedGroups.map((group) => (
            <div key={group.category} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
              <dt className="shrink-0 pt-1 text-xs font-medium text-muted-foreground sm:w-32">
                {amenityCategoryLabels[group.category]}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {group.names.map((name) => (
                  <span key={name} className={cn(chipClass, 'border-input bg-muted')}>
                    {name}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">Todavia no marcaste ninguna.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caracteristicas del local</DialogTitle>
          </DialogHeader>

          <p className="-mt-2 text-xs text-muted-foreground">
            Marca lo que tiene tu local. Las de esta lista sirven como filtro en la busqueda.
          </p>

          {catalogQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando caracteristicas...</p>
          ) : null}
          {catalogQuery.isError ? (
            <p className="sf-form-error">No se pudo cargar la lista. Cierra e intenta de nuevo.</p>
          ) : null}

          <div className="space-y-4">
            {categories.map((category) => {
              const amenities = catalogQuery.data?.[category] ?? [];
              const custom = customFeatures.filter((feature) => feature.category === category);
              if (amenities.length === 0 && custom.length === 0) return null;

              return (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {amenityCategoryLabels[category]}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {amenities.map((amenity) => {
                      const isSelected = amenityIds.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={cn(
                            chipClass,
                            'transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {amenity.name}
                        </button>
                      );
                    })}
                    {custom.map((feature) => (
                      <span
                        key={feature.name}
                        className={cn(
                          chipClass,
                          'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {feature.name}
                        <button
                          type="button"
                          aria-label={`Quitar ${feature.name}`}
                          onClick={() =>
                            setCustomFeatures((current) =>
                              current.filter((item) => item.name !== feature.name),
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="custom-feature-name">Agregar una que no esta en la lista</Label>
            <p className="text-xs text-muted-foreground">
              Se muestra en tu ficha, pero no sirve como filtro de busqueda.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                id="custom-feature-name"
                className="min-w-[10rem] flex-1"
                placeholder="Vista al Illimani"
                maxLength={MAX_CUSTOM_FEATURE_LENGTH}
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  setMessage(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomFeature();
                  }
                }}
              />
              <Select
                aria-label="Categoria de la caracteristica"
                className="w-auto"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value as AmenityCategory)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {amenityCategoryLabels[category]}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="outline" onClick={addCustomFeature}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            {message ? (
              <p className={message.isError ? 'sf-form-error' : 'text-xs text-muted-foreground'}>
                {message.text}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton
              type="button"
              isLoading={saveMutation.isPending}
              disabled={catalogQuery.isLoading || catalogQuery.isError}
              onClick={() => saveMutation.mutate()}
            >
              Guardar
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
