import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller';
import { VenueService } from '../application/services/venue.service';
import { SlugService } from '../application/services/slug.service';
import { CreateVenueUseCase } from '../application/use-cases/create-venue.use-case';
import { GetVenueBySlugUseCase } from '../application/use-cases/get-venue-by-slug.use-case';
import { GetSimilarVenuesUseCase } from '../application/use-cases/get-similar-venues.use-case';
import { SearchVenuesUseCase } from '../application/use-cases/search-venues.use-case';
import { UpdateVenueUseCase } from '../application/use-cases/update-venue.use-case';
import { DeleteVenueUseCase } from '../application/use-cases/delete-venue.use-case';
import { VenueRepository } from '../infrastructure/repositories/venue.repository';
import { VENUE_REPOSITORY } from '../domain/repositories/venue.repository.interface';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UploadModule } from '../../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [VenueController],
  providers: [
    VenueService,
    SlugService,
    CreateVenueUseCase,
    GetVenueBySlugUseCase,
    GetSimilarVenuesUseCase,
    SearchVenuesUseCase,
    UpdateVenueUseCase,
    DeleteVenueUseCase,
    {
      provide: VENUE_REPOSITORY,
      useClass: VenueRepository,
    },
  ],
  exports: [VenueService, VENUE_REPOSITORY],
})
export class VenueModule {}
