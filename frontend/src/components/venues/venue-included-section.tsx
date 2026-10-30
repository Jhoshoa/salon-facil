import Image from 'next/image';
import { Check } from 'lucide-react';
import { cloudinaryImageLoader } from '@/lib/cloudinary-image-loader';
import { groupRentalItemsByCategory } from '@/lib/rental-items';
import type { AmenityCategory, Venue, VenueRentalItem } from '@/types/api';
import { amenityCategoryLabels } from './venue-filter-labels';

interface VenueIncludedSectionProps {
  venue: Pick<Venue, 'amenities' | 'customFeatures'>;
  items: VenueRentalItem[];
}

const groupTitleClass =
  'mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground first:mt-0';
const rowClass = 'flex items-center gap-2.5 border-t border-border py-2.5 text-sm first:border-t-0';
const checkIcon = <Check className="h-3.5 w-3.5 shrink-0 text-city-green" />;

/** Everything the rental price already covers, whichever way the owner registered it: features
 * from the shared list, their own features, and catalog items marked as included. */
export const VenueIncludedSection = ({ venue, items }: VenueIncludedSectionProps) => {
  const featureGroups = (Object.keys(amenityCategoryLabels) as AmenityCategory[])
    .map((category) => ({
      category,
      names: [
        ...(venue.amenities ?? [])
          .filter((item) => item.isIncluded && item.amenity.category === category)
          .map((item) => item.amenity.name),
        ...(venue.customFeatures ?? [])
          .filter((feature) => feature.category === category)
          .map((feature) => feature.name),
      ],
    }))
    .filter((group) => group.names.length > 0);

  if (featureGroups.length === 0 && items.length === 0) return null;

  return (
    <section className="sf-detail-section">
      <h2 className="sf-detail-title">Incluido con el local</h2>
      <div>
        {featureGroups.map((group) => (
          <div key={group.category}>
            <p className={groupTitleClass}>{amenityCategoryLabels[group.category]}</p>
            {group.names.map((name) => (
              <div key={name} className={rowClass}>
                {checkIcon}
                <span>{name}</span>
              </div>
            ))}
          </div>
        ))}

        {groupRentalItemsByCategory(items).map((group) => (
          <div key={group.category.id}>
            <p className={groupTitleClass}>{group.category.name}</p>
            {group.items.map((item) => (
              <div key={item.id} className={rowClass}>
                {checkIcon}
                {item.photoUrl ? (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted">
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      loader={cloudinaryImageLoader}
                      sizes="32px"
                    />
                  </div>
                ) : null}
                <span className="min-w-0">
                  {item.name}
                  {item.stockQty ? (
                    <span className="text-muted-foreground"> · {item.stockQty}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};
