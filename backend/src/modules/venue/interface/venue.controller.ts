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
import { VenueService } from '../application/services/venue.service';
import { CreateVenueUseCase } from '../application/use-cases/create-venue.use-case';
import { GetVenueBySlugUseCase } from '../application/use-cases/get-venue-by-slug.use-case';
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
}
