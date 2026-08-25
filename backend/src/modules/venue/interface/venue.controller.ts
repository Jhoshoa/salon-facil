import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { CreateVenueDto } from '../application/dto/create-venue.dto';
import { UpdateVenueDto } from '../application/dto/update-venue.dto';
import { VenueFilterDto } from '../application/dto/venue-filter.dto';
import {
  CreateAmenityDto,
  CreateCatalogItemDto,
  UpdateAmenityDto,
  UpdateCatalogItemDto,
} from '../application/dto/catalog.dto';
import { VenueService } from '../application/services/venue.service';
import { CreateVenueUseCase } from '../application/use-cases/create-venue.use-case';
import { GetVenueBySlugUseCase } from '../application/use-cases/get-venue-by-slug.use-case';
import { GetSimilarVenuesUseCase } from '../application/use-cases/get-similar-venues.use-case';
import { SearchVenuesUseCase } from '../application/use-cases/search-venues.use-case';
import { CloudinaryService } from '../../upload/cloudinary.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 20;

function validateFiles(files: Express.Multer.File[] | undefined): void {
  if (!files || files.length === 0) return;

  if (files.length > MAX_PHOTOS) {
    throw new BadRequestException(
      `Máximo ${MAX_PHOTOS} fotos por local, recibidas ${files.length}`,
    );
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo MIME no permitido: ${file.mimetype}. Solo se aceptan: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Archivo "${file.originalname}" excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }
}

@ApiTags('Venues')
@Controller('venues')
export class VenueController {
  constructor(
    private readonly venueService: VenueService,
    private readonly createVenueUseCase: CreateVenueUseCase,
    private readonly getVenueBySlugUseCase: GetVenueBySlugUseCase,
    private readonly getSimilarVenuesUseCase: GetSimilarVenuesUseCase,
    private readonly searchVenuesUseCase: SearchVenuesUseCase,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ========== PUBLIC ENDPOINTS ==========

  @Get()
  @Public()
  @ApiOperation({ summary: 'Buscar locales con filtros' })
  @ApiResponse({ status: 200, description: 'Resultados de la búsqueda' })
  async search(@Query() filters: VenueFilterDto) {
    return this.searchVenuesUseCase.execute(filters);
  }

  @Get('my/venues')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis locales (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de locales del propietario' })
  async getMyVenues(@CurrentUser() user: { id: string }) {
    return this.venueService.getMyVenues(user.id);
  }

  @Get('catalog/amenities')
  @Public()
  @ApiOperation({ summary: 'Obtener catalogo de comodidades para filtros' })
  @ApiResponse({ status: 200, description: 'Catalogo de comodidades agrupado por categoria' })
  async getAmenitiesCatalog() {
    return this.venueService.getAmenitiesCatalog();
  }

  @Get('catalog/space-types')
  @Public()
  @ApiOperation({ summary: 'Obtener tipos de espacio disponibles' })
  @ApiResponse({ status: 200, description: 'Tipos de espacio disponibles' })
  getSpaceTypesCatalog() {
    return this.venueService.getSpaceTypesCatalog();
  }

  @Get('catalog/use-types')
  @Public()
  @ApiOperation({ summary: 'Obtener tipos de evento disponibles' })
  @ApiResponse({ status: 200, description: 'Tipos de evento disponibles' })
  getUseTypesCatalog() {
    return this.venueService.getUseTypesCatalog();
  }

  @Get(':slug/similar')
  @Public()
  @ApiOperation({ summary: 'Obtener locales similares a uno dado' })
  @ApiResponse({ status: 200, description: 'Lista de locales similares' })
  @ApiResponse({ status: 404, description: 'Local no encontrado' })
  async getSimilar(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.getSimilarVenuesUseCase.execute(slug, limit ? Number(limit) : undefined);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Obtener local por slug' })
  @ApiResponse({ status: 200, description: 'Local encontrado' })
  @ApiResponse({ status: 404, description: 'Local no encontrado' })
  async getBySlug(@Param('slug') slug: string) {
    return this.getVenueBySlugUseCase.execute(slug);
  }

  // ========== PROTECTED ENDPOINTS (OWNER / ADMIN) ==========

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS, {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo local con fotos (OWNER/ADMIN)' })
  @ApiResponse({ status: 201, description: 'Local creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async create(
    @Body() dto: CreateVenueDto,
    @CurrentUser() user: { id: string },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    validateFiles(files);

    if (files && files.length > 0) {
      const photoUrls = await this.cloudinaryService.uploadMultiple(files, `venues/${user.id}`);
      dto.photos = [...(dto.photos ?? []), ...photoUrls];
    }

    return this.createVenueUseCase.execute(dto, user.id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS, {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Actualizar local (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Local actualizado' })
  @ApiResponse({ status: 403, description: 'No es propietario del local' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: { id: string; role: UserRole },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    validateFiles(files);

    if (files && files.length > 0) {
      const photoUrls = await this.cloudinaryService.uploadMultiple(files, `venues/${user.id}`);
      dto.photos = [...(dto.photos ?? []), ...photoUrls];
    }

    return this.venueService.updateVenue(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar local — soft delete (OWNER/ADMIN)' })
  @ApiResponse({ status: 204, description: 'Local eliminado' })
  @ApiResponse({ status: 403, description: 'No es propietario del local' })
  async delete(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    await this.venueService.deleteVenue(id, user.id, user.role);
  }

  @Get(':id/completion')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener porcentaje de completitud del local (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Score de completitud y campos faltantes' })
  async getCompletion(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.venueService.getVenueCompletion(id, user.id, user.role);
  }

  @Put(':id/publish')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enviar local a revision (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Local enviado a revision (PENDING)' })
  @ApiResponse({ status: 400, description: 'Faltan datos requeridos para publicar' })
  async publish(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.venueService.submitForReview(id, user.id, user.role);
  }

  @Post(':id/media')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS, {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Agregar fotos al local (OWNER/ADMIN)' })
  @ApiResponse({ status: 201, description: 'Fotos agregadas' })
  async addMedia(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Debes adjuntar al menos una foto');
    }
    validateFiles(files);

    const photoUrls = await this.cloudinaryService.uploadMultiple(files, `venues/${user.id}`);
    return this.venueService.addVenueMedia(id, user.id, user.role, photoUrls);
  }

  @Put(':id/media/order')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar fotos y definir portada (OWNER/ADMIN)' })
  @ApiResponse({ status: 200, description: 'Fotos reordenadas' })
  async reorderMedia(
    @Param('id') id: string,
    @Body('order') order: string[],
    @Body('coverId') coverId: string | undefined,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    if (!Array.isArray(order) || order.length === 0) {
      throw new BadRequestException('order debe ser un arreglo con los IDs de las fotos');
    }
    return this.venueService.reorderVenueMedia(id, user.id, user.role, order, coverId);
  }

  @Delete(':id/media/:mediaId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una foto del local (OWNER/ADMIN)' })
  @ApiResponse({ status: 204, description: 'Foto eliminada' })
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    await this.venueService.deleteVenueMedia(id, mediaId, user.id, user.role);
  }

  // ========== ADMIN ENDPOINTS ==========

  @Put(':id/verify')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar/rechazar local (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Estado del local actualizado' })
  @ApiResponse({ status: 403, description: 'No es administrador' })
  async verify(
    @Param('id') id: string,
    @Body('approve') approve: boolean,
    @CurrentUser() user: { id: string },
  ) {
    return this.venueService.verifyVenue(id, user.id, approve);
  }

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cola de locales pendientes de revision (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Locales con estado PENDING' })
  async getPendingVenues() {
    return this.venueService.getVenuesByStatus('PENDING');
  }

  // --- Catalog management: space types ---

  @Get('admin/catalog/space-types')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar tipos de espacio, incluyendo inactivos (ADMIN)' })
  async getAdminSpaceTypes() {
    return this.venueService.getAdminSpaceTypesCatalog();
  }

  @Post('admin/catalog/space-types')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear tipo de espacio (ADMIN)' })
  async createSpaceType(@Body() dto: CreateCatalogItemDto) {
    return this.venueService.createSpaceType(dto);
  }

  @Put('admin/catalog/space-types/:catalogId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar o desactivar un tipo de espacio (ADMIN)' })
  async updateSpaceType(@Param('catalogId') catalogId: string, @Body() dto: UpdateCatalogItemDto) {
    return this.venueService.updateSpaceType(catalogId, dto);
  }

  // --- Catalog management: use types ("ideal para") ---

  @Get('admin/catalog/use-types')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar tipos de evento, incluyendo inactivos (ADMIN)' })
  async getAdminUseTypes() {
    return this.venueService.getAdminUseTypesCatalog();
  }

  @Post('admin/catalog/use-types')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear tipo de evento (ADMIN)' })
  async createUseType(@Body() dto: CreateCatalogItemDto) {
    return this.venueService.createUseType(dto);
  }

  @Put('admin/catalog/use-types/:catalogId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar o desactivar un tipo de evento (ADMIN)' })
  async updateUseType(@Param('catalogId') catalogId: string, @Body() dto: UpdateCatalogItemDto) {
    return this.venueService.updateUseType(catalogId, dto);
  }

  // --- Catalog management: amenities ---

  @Get('admin/catalog/amenities')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar comodidades, incluyendo inactivas (ADMIN)' })
  async getAdminAmenities() {
    return this.venueService.getAdminAmenitiesCatalog();
  }

  @Post('admin/catalog/amenities')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear comodidad (ADMIN)' })
  async createAmenity(@Body() dto: CreateAmenityDto) {
    return this.venueService.createAmenity(dto);
  }

  @Put('admin/catalog/amenities/:catalogId')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar o desactivar una comodidad (ADMIN)' })
  async updateAmenity(@Param('catalogId') catalogId: string, @Body() dto: UpdateAmenityDto) {
    return this.venueService.updateAmenity(catalogId, dto);
  }
}
