import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

export interface VenueCompletion {
  score: number;
  missing: string[];
  canPublish: boolean;
}

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

  async getSimilarVenues(slug: string, limit = 4): Promise<VenueEntity[]> {
    const venue = await this.venueRepository.findBySlug(slug);
    if (!venue) {
      throw new NotFoundException(`Local con slug '${slug}' no encontrado`);
    }
    return this.venueRepository.findSimilar(venue, limit);
  }

  async getMyVenues(ownerId: string): Promise<VenueEntity[]> {
    return this.venueRepository.findByOwner(ownerId);
  }

  /** Internal use only (notifications) — see findOwnerContact on the repository interface. */
  async getOwnerContact(
    venueId: string,
  ): Promise<{ id: string; email: string; phone: string; fullName: string } | null> {
    return this.venueRepository.findOwnerContact(venueId);
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
    this.validateSearchFilters(filters);

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

  async getAmenitiesCatalog() {
    const amenities = await this.venueRepository.findAmenities();

    return amenities.reduce<Record<string, typeof amenities>>((groups, amenity) => {
      groups[amenity.category] = groups[amenity.category] ?? [];
      groups[amenity.category].push(amenity);
      return groups;
    }, {});
  }

  getSpaceTypesCatalog() {
    return this.venueRepository.findSpaceTypes();
  }

  getUseTypesCatalog() {
    return this.venueRepository.findUseTypes();
  }

  async getVenuesByStatus(status: string): Promise<VenueEntity[]> {
    return this.venueRepository.findByStatus(status);
  }

  // ===== Admin catalog management (space types / use types / amenities) =====
  // Deliberately admin-only governance (confirmed with the platform owner): owners pick from
  // these lists but never create entries themselves, to avoid duplicate/messy taxonomy.

  getAdminAmenitiesCatalog() {
    return this.venueRepository.findAmenities(true);
  }

  createAmenity(data: Parameters<IVenueRepository['createAmenity']>[0]) {
    return this.venueRepository.createAmenity(data);
  }

  updateAmenity(id: string, data: Parameters<IVenueRepository['updateAmenity']>[1]) {
    return this.venueRepository.updateAmenity(id, data);
  }

  getAdminSpaceTypesCatalog() {
    return this.venueRepository.findSpaceTypes(true);
  }

  createSpaceType(data: Parameters<IVenueRepository['createSpaceType']>[0]) {
    return this.venueRepository.createSpaceType(data);
  }

  updateSpaceType(id: string, data: Parameters<IVenueRepository['updateSpaceType']>[1]) {
    return this.venueRepository.updateSpaceType(id, data);
  }

  getAdminUseTypesCatalog() {
    return this.venueRepository.findUseTypes(true);
  }

  createUseType(data: Parameters<IVenueRepository['createUseType']>[0]) {
    return this.venueRepository.createUseType(data);
  }

  updateUseType(id: string, data: Parameters<IVenueRepository['updateUseType']>[1]) {
    return this.venueRepository.updateUseType(id, data);
  }

  getSeasonalEventsCatalog() {
    return this.venueRepository.findSeasonalEvents();
  }

  getAdminSeasonalEventsCatalog() {
    return this.venueRepository.findSeasonalEvents(true);
  }

  createSeasonalEvent(data: Parameters<IVenueRepository['createSeasonalEvent']>[0]) {
    this.validateSeasonalEventDates(data.startDate, data.endDate);
    return this.venueRepository.createSeasonalEvent(data);
  }

  updateSeasonalEvent(id: string, data: Parameters<IVenueRepository['updateSeasonalEvent']>[1]) {
    if (data.startDate || data.endDate) {
      // Partial updates might only touch one bound; re-derive the other from... we don't have
      // it here without a read, so this check only fires when both are sent together (the UI
      // always sends both since it's a single date-range field pair).
      if (data.startDate && data.endDate) {
        this.validateSeasonalEventDates(data.startDate, data.endDate);
      }
    }
    return this.venueRepository.updateSeasonalEvent(id, data);
  }

  private validateSeasonalEventDates(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new BadRequestException('endDate debe ser igual o posterior a startDate');
    }
  }

  async addVenueMedia(
    id: string,
    userId: string,
    userRole: UserRole,
    urls: string[],
  ): Promise<VenueEntity['media']> {
    const venue = await this.getVenueById(id);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }
    return this.venueRepository.addMedia(id, urls);
  }

  async deleteVenueMedia(
    id: string,
    mediaId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const venue = await this.getVenueById(id);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }
    await this.venueRepository.deleteMedia(id, mediaId);
  }

  async reorderVenueMedia(
    id: string,
    userId: string,
    userRole: UserRole,
    order: string[],
    coverId?: string,
  ): Promise<VenueEntity['media']> {
    const venue = await this.getVenueById(id);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }
    return this.venueRepository.reorderMedia(id, order, coverId);
  }

  async getVenueCompletion(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<VenueCompletion> {
    const venue = await this.getVenueById(id);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para ver este local');
    }
    return this.computeCompletion(venue);
  }

  async submitForReview(id: string, userId: string, userRole: UserRole): Promise<VenueEntity> {
    const venue = await this.getVenueById(id);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para publicar este local');
    }
    if (venue.status !== VenueStatus.DRAFT && venue.status !== VenueStatus.REJECTED) {
      throw new BadRequestException(
        'Solo puedes enviar a revision un local en borrador o rechazado',
      );
    }

    const completion = this.computeCompletion(venue);
    if (!completion.canPublish) {
      throw new BadRequestException(
        `Completa la informacion requerida antes de publicar: ${completion.missing.join(', ')}`,
      );
    }

    return this.venueRepository.updateStatus(id, VenueStatus.PENDING);
  }

  private computeCompletion(venue: VenueEntity): VenueCompletion {
    const checks: { label: string; done: boolean; required: boolean }[] = [
      { label: 'Nombre y descripcion', done: venue.description.length >= 20, required: true },
      {
        label: 'Direccion y distrito',
        done: Boolean(venue.address && venue.district),
        required: true,
      },
      { label: 'Capacidad maxima', done: venue.capacityMax > 0, required: true },
      { label: 'Al menos una foto', done: (venue.media?.length ?? 0) > 0, required: true },
      { label: 'Tipo de espacio', done: Boolean(venue.spaceType), required: true },
      {
        label: 'Precio base',
        done: (venue.prices ?? []).some((p) => p.priceType === 'BASE'),
        required: true,
      },
      {
        label: 'Horarios de atencion',
        done: (venue.openingHours ?? []).some((h) => !h.isClosed),
        required: true,
      },
      { label: 'Comodidades', done: (venue.amenities?.length ?? 0) > 0, required: false },
      {
        label: 'Tipos de evento (ideal para)',
        done: (venue.uses?.length ?? 0) > 0,
        required: false,
      },
      { label: 'Descripcion corta', done: Boolean(venue.shortDescription), required: false },
      { label: 'Reglas del espacio', done: Boolean(venue.rules), required: false },
      {
        label: 'Ubicacion en el mapa',
        done: venue.latitude != null && venue.longitude != null,
        required: false,
      },
    ];

    const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
    const missing = checks.filter((c) => !c.done).map((c) => c.label);
    const canPublish = checks.filter((c) => c.required).every((c) => c.done);

    return { score, missing, canPublish };
  }

  async verifyVenue(id: string, adminId: string, approve: boolean): Promise<VenueEntity> {
    if (approve) {
      return this.venueRepository.updateStatus(id, VenueStatus.ACTIVE, adminId);
    }
    return this.venueRepository.updateStatus(id, VenueStatus.REJECTED);
  }

  private validateSearchFilters(filters: VenueFilterDto): void {
    const startDateValue = filters.startDate ?? filters.date;

    if (!startDateValue) {
      throw new BadRequestException('startDate es obligatorio para buscar disponibilidad');
    }

    if (filters.guestCount == null || filters.guestCount < 1) {
      throw new BadRequestException('guestCount es obligatorio para buscar disponibilidad');
    }

    const startDate = new Date(startDateValue);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('La fecha de busqueda no es valida');
    }

    if (startDateValue && filters.endDate) {
      const endDate = new Date(filters.endDate);

      if (Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Las fechas de busqueda no son validas');
      }

      if (endDate < startDate) {
        throw new BadRequestException('endDate debe ser mayor o igual a startDate');
      }
    }

    if (
      filters.minPrice != null &&
      filters.maxPrice != null &&
      filters.minPrice > filters.maxPrice
    ) {
      throw new BadRequestException('minPrice debe ser menor o igual a maxPrice');
    }

    if (
      filters.minCapacity != null &&
      filters.maxCapacity != null &&
      filters.minCapacity > filters.maxCapacity
    ) {
      throw new BadRequestException('minCapacity debe ser menor o igual a maxCapacity');
    }

    if ((filters.startTime && !filters.endTime) || (!filters.startTime && filters.endTime)) {
      throw new BadRequestException('startTime y endTime deben enviarse juntos');
    }

    if ((filters.startTime || filters.endTime) && !startDateValue) {
      throw new BadRequestException('startDate debe enviarse cuando se filtra por hora');
    }

    if (filters.startTime && filters.endTime && filters.startTime >= filters.endTime) {
      throw new BadRequestException('endTime debe ser mayor a startTime');
    }

    const hasPartialBounds =
      filters.north != null ||
      filters.south != null ||
      filters.east != null ||
      filters.west != null;
    const hasAllBounds =
      filters.north != null &&
      filters.south != null &&
      filters.east != null &&
      filters.west != null;

    if (hasPartialBounds && !hasAllBounds) {
      throw new BadRequestException('north, south, east y west deben enviarse juntos');
    }

    if (hasAllBounds) {
      if (filters.south! > filters.north!) {
        throw new BadRequestException('south debe ser menor o igual a north');
      }

      if (filters.west! > filters.east!) {
        throw new BadRequestException('west debe ser menor o igual a east');
      }
    }
  }
}
