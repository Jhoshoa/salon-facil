import { Injectable } from '@nestjs/common';
import { VenueService } from '../services/venue.service';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@Injectable()
export class UpdateVenueUseCase {
  constructor(private readonly venueService: VenueService) {}

  async execute(id: string, dto: UpdateVenueDto, userId: string, userRole: UserRole) {
    return this.venueService.updateVenue(id, dto, userId, userRole);
  }
}
