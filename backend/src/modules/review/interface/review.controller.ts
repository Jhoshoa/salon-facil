import {
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { ReviewEntity } from '../domain/entities/review.entity';
import { ReviewService } from '../application/services/review.service';
import { CreateReviewDto } from '../application/dto/create-review.dto';
import { UpdateReviewDto } from '../application/dto/update-review.dto';
import { OwnerResponseDto } from '../application/dto/owner-response.dto';

// The client's email is fetched internally so the service can notify them of an owner's
// response, but must never reach a public/other-user response — this is the only place
// review entities get serialized back to a client.
const toPublicReviewDto = (review: ReviewEntity) => ({
  id: review.id,
  venueId: review.venueId,
  clientId: review.clientId,
  bookingId: review.bookingId,
  rating: review.rating,
  comment: review.comment,
  isVerified: review.isVerified,
  ownerResponse: review.ownerResponse,
  ownerResponseAt: review.ownerResponseAt,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  client: review.client ? { id: review.client.id, fullName: review.client.fullName } : undefined,
});

@ApiTags('Reviews')
@Controller('venues/:venueId/reviews')
export class VenueReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar reseñas de un local' })
  @ApiResponse({ status: 200, description: 'Reseñas paginadas del local' })
  async getVenueReviews(
    @Param('venueId') venueId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.reviewService.getVenueReviews(
      venueId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
    return { ...result, data: result.data.map(toPublicReviewDto) };
  }
}

@ApiTags('Reviews')
@Controller('bookings/:bookingId/review')
export class BookingReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi reseña de una reserva (CLIENT)' })
  @ApiResponse({ status: 200, description: 'Reseña existente o null' })
  async getMyReview(@Param('bookingId') bookingId: string, @CurrentUser() user: { id: string }) {
    const review = await this.reviewService.getReviewByBooking(bookingId, user.id);
    return review ? toPublicReviewDto(review) : null;
  }

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Calificar una reserva completada (CLIENT)' })
  @ApiResponse({ status: 201, description: 'Reseña creada' })
  @ApiResponse({ status: 400, description: 'La reserva no esta completada' })
  @ApiResponse({ status: 403, description: 'No es tu reserva' })
  @ApiResponse({ status: 409, description: 'Ya calificaste esta reserva' })
  async createReview(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    const review = await this.reviewService.createReview(bookingId, user.id, dto);
    return toPublicReviewDto(review);
  }
}

@ApiTags('Reviews')
@Controller('reviews/:reviewId')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Put()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar mi reseña (CLIENT, autor)' })
  @ApiResponse({ status: 200, description: 'Reseña actualizada' })
  @ApiResponse({ status: 403, description: 'No es tu reseña' })
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    const review = await this.reviewService.updateReview(reviewId, user.id, dto);
    return toPublicReviewDto(review);
  }

  @Delete()
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una reseña (autor o ADMIN)' })
  @ApiResponse({ status: 204, description: 'Reseña borrada' })
  async deleteReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    await this.reviewService.deleteReview(reviewId, user.id, user.role);
  }

  @Post('response')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder a una reseña (OWNER del local, o ADMIN)' })
  @ApiResponse({ status: 201, description: 'Respuesta guardada' })
  @ApiResponse({ status: 400, description: 'Esta reseña ya tiene respuesta' })
  @ApiResponse({ status: 403, description: 'No sos el propietario de este local' })
  async respond(
    @Param('reviewId') reviewId: string,
    @Body() dto: OwnerResponseDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    const review = await this.reviewService.respondToReview(reviewId, user.id, user.role, dto);
    return toPublicReviewDto(review);
  }
}
