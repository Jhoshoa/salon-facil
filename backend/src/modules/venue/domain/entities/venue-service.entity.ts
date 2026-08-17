export class VenueServiceEntity {
  id!: string;
  venueId!: string;
  name!: string;
  icon: string | null = null;
  description: string | null = null;
  isIncluded: boolean = true;
  extraCost: number | null = null;
  sortOrder: number = 0;
  createdAt!: Date;

  constructor(partial: Partial<VenueServiceEntity>) {
    Object.assign(this, partial);
  }
}
