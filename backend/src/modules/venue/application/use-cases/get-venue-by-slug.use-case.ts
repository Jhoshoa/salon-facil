import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';

@Injectable()
export class GetVenueBySlugUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(slug: string) {
    return this.venueService.getVenueBySlug(slug);
  }
}
