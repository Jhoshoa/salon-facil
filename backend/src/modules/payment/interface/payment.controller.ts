import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
}
