import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../auth/domain/entities/user.entity';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  RefundPaymentDto,
  RejectPaymentDto,
} from '../application/dto/payment.dto';
import { PaymentService } from '../application/services/payment.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('bookings/:bookingId')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear pago pendiente para una reserva' })
  @ApiResponse({ status: 201, description: 'Pago creado' })
  async createPayment(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentService.createPayment(bookingId, user.id, dto);
  }

  @Post(':paymentId/proof')
  @Roles(UserRole.CLIENT)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir comprobante de pago' })
  @ApiResponse({ status: 200, description: 'Comprobante cargado' })
  async uploadProof(
    @Param('paymentId') paymentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentService.uploadProof(paymentId, user.id, file);
  }

  @Get('my')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Obtener mis pagos' })
  @ApiResponse({ status: 200, description: 'Pagos del cliente' })
  async getMyPayments(@CurrentUser() user: { id: string }) {
    return this.paymentService.getMyPayments(user.id);
  }

  @Get('booking/:bookingId')
  @Roles(UserRole.CLIENT, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener pagos de una reserva' })
  @ApiResponse({ status: 200, description: 'Pagos de la reserva' })
  async getBookingPayments(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.paymentService.getBookingPayments(bookingId, user.id, user.role);
  }

  @Get('owner/pending')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener pagos pendientes de mis locales' })
  @ApiResponse({ status: 200, description: 'Pagos pendientes' })
  async getPendingOwnerPayments(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.paymentService.getPendingOwnerPayments(user.id, user.role);
  }

  @Get('owner/earnings')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Resumen de ganancias del propietario, agregado por todos sus locales' })
  @ApiResponse({ status: 200, description: 'Resumen y desglose de ganancias' })
  async getOwnerEarnings(
    @CurrentUser() user: { id: string },
    @Query('months') months?: string,
    @Query('venueId') venueId?: string,
  ) {
    return this.paymentService.getOwnerEarnings(user.id, months ? Number(months) : 6, venueId);
  }

  @Get('owner/earnings/payments')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Detalle de pagos completados detras de una fila de ganancias' })
  @ApiResponse({ status: 200, description: 'Pagos completados que calzan con el filtro' })
  async getOwnerEarningsPayments(
    @CurrentUser() user: { id: string },
    @Query('venueId') venueId?: string,
    @Query('method') method?: string,
    @Query('month') month?: string,
    @Query('monthsBack') monthsBack?: string,
  ) {
    return this.paymentService.getOwnerCompletedPayments(user.id, {
      venueId,
      method,
      month,
      monthsBack: monthsBack ? Number(monthsBack) : undefined,
    });
  }

  @Put(':paymentId/confirm')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirmar pago' })
  @ApiResponse({ status: 200, description: 'Pago confirmado' })
  async confirmPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.paymentService.confirmPayment(paymentId, user.id, user.role, dto.notes);
  }

  @Put(':paymentId/reject')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Rechazar pago' })
  @ApiResponse({ status: 200, description: 'Pago rechazado' })
  async rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.paymentService.rejectPayment(paymentId, user.id, user.role, dto.reason);
  }

  @Put(':paymentId/refund')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reembolsar un pago confirmado (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Pago reembolsado' })
  @ApiResponse({ status: 400, description: 'El pago no esta confirmado' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentService.refundPayment(paymentId, user.id, dto.reason);
  }
}
