import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IVenueRepository,
  VENUE_REPOSITORY,
} from '../../domain/repositories/venue.repository.interface';
import { SlugService } from './slug.service';
import { CreateVenueDto } from '../dto/create-venue.dto';
import { UpdateVenueDto } from '../dto/update-venue.dto';
import { VenueFilterDto } from '../dto/venue-filter.dto';
import { VenueEntity, VenueStatus } from '../../domain/entities/venue.entity';
import { UserRole } from '../../../auth/domain/entities/user.entity';

@Injectable()
export class VenueService {
  constructor(
    @Inject(VENUE_REPOSITORY)
    private readonly venueRepository: IVenueRepository,
    private readonly slugService: SlugService,
  ) {}

  async createVenue(dto: CreateVenueDto, ownerId: string): Promise<VenueEntity> {
    const slug = await this.slugService.generateSlug(dto.name, (s) =>
      this.venueRepository.existsBySlug(s),
    );

    return this.venueRepository.create(
      { ...dto, slug, photos: dto.photos ?? [] } as Record<string, unknown>,
      ownerId,
    );
  }

  async getVenueById(id: string): Promise<VenueEntity> {
    const venue = await this.venueRepository.findById(id);
    if (!venue) {
      throw new NotFoundException(`Local con ID '${id}' no encontrado`);
    }
    return venue;
  }

  async getVenueBySlug(slug: string): Promise<VenueEntity> {
    const venue = await this.venueRepository.findBySlug(slug);
    if (!venue) {
      throw new NotFoundException(`Local con slug '${slug}' no encontrado`);
    }
    this.venueRepository.incrementViewCount(venue.id).catch(() => {});
    venue.viewCount += 1;
    return venue;
  }

  async getMyVenues(ownerId: string): Promise<VenueEntity[]> {
    return this.venueRepository.findByOwner(ownerId);
  }

  async updateVenue(
    id: string,
    dto: UpdateVenueDto,
    userId: string,
    userRole: UserRole,
  ): Promise<VenueEntity> {
    const venue = await this.getVenueById(id);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }

    const updateData: Record<string, unknown> = { ...dto };

    if (dto.name && dto.name !== venue.name) {
      updateData.slug = await this.slugService.generateSlug(dto.name, (s) =>
        this.venueRepository.existsBySlug(s),
      );
    }

    return this.venueRepository.update(id, updateData);
  }

  async deleteVenue(id: string, userId: string, userRole: UserRole): Promise<void> {
    const venue = await this.getVenueById(id);

    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para eliminar este local');
    }

    await this.venueRepository.softDelete(id);
  }

  async searchVenues(filters: VenueFilterDto): Promise<{
    venues: VenueEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const { venues, total } = await this.venueRepository.search(filters);

    return {
      venues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async verifyVenue(id: string, adminId: string, approve: boolean): Promise<VenueEntity> {
    if (approve) {
      return this.venueRepository.updateStatus(id, VenueStatus.ACTIVE, adminId);
    }
    return this.venueRepository.updateStatus(id, VenueStatus.REJECTED);
  }
}
