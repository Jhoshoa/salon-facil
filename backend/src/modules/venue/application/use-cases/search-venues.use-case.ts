import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { VenueFilterDto } from '../dto/venue-filter.dto';

@Injectable()
export class SearchVenuesUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(filters: VenueFilterDto) {
    return this.venueService.searchVenues(filters);
  }
}
