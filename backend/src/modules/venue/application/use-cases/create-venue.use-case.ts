import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { CreateVenueDto } from '../dto/create-venue.dto';

@Injectable()
export class CreateVenueUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(dto: CreateVenueDto, ownerId: string) {
    return this.venueService.createVenue(dto, ownerId);
  }
}
