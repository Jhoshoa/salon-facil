import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import { ReviewService } from '../application/services/review.service';
import { CreateReviewDto } from '../application/dto/create-review.dto';

@ApiTags('Reviews')
@Controller('venues/:venueId/reviews')
export class VenueReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar resenas de un local' })
  @ApiResponse({ status: 200, description: 'Resenas paginadas del local' })
  async getVenueReviews(
    @Param('venueId') venueId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getVenueReviews(
      venueId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}

@ApiTags('Reviews')
@Controller('bookings/:bookingId/review')
export class BookingReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi resena de una reserva (CLIENT)' })
  @ApiResponse({ status: 200, description: 'Resena existente o null' })
  async getMyReview(@Param('bookingId') bookingId: string, @CurrentUser() user: { id: string }) {
    return this.reviewService.getReviewByBooking(bookingId, user.id);
  }

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Calificar una reserva completada (CLIENT)' })
  @ApiResponse({ status: 201, description: 'Resena creada' })
  @ApiResponse({ status: 400, description: 'La reserva no esta completada' })
  @ApiResponse({ status: 403, description: 'No es tu reserva' })
  @ApiResponse({ status: 409, description: 'Ya calificaste esta reserva' })
  async createReview(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewService.createReview(bookingId, user.id, dto);
  }
}
