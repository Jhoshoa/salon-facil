import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';

@Injectable()
export class GetSimilarVenuesUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(slug: string, limit?: number) {
    return this.venueService.getSimilarVenues(slug, limit);
  }
}
