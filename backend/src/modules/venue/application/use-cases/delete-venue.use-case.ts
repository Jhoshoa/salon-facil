import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@Injectable()
export class DeleteVenueUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(id: string, userId: string, userRole: UserRole) {
    return this.venueService.deleteVenue(id, userId, userRole);
  }
}
