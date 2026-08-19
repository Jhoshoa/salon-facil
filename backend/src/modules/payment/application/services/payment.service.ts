import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Express } from 'express';
import { BookingStatus } from '../../../booking/domain/entities/booking.entity';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../../booking/domain/repositories/booking.repository.interface';
import { UserRole } from '../../../auth/domain/entities/user.entity';
import { VenueService } from '../../../venue/application/services/venue.service';
import { CloudinaryService } from '../../../upload/cloudinary.service';
import { CreatePaymentDto } from '../dto/payment.dto';
import { PaymentEntity, PaymentStatus, PaymentType } from '../../domain/entities/payment.entity';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface';

const PAYABLE_BOOKING_STATUSES = [BookingStatus.APPROVED, BookingStatus.DEPOSIT_PAID];
const ALLOWED_PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly venueService: VenueService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createPayment(
    bookingId: string,
    clientId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    if (booking.clientId !== clientId) {
      throw new ForbiddenException('No puedes crear pagos para una reserva que no es tuya');
    }

    if (!PAYABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Esta reserva no admite pagos en su estado actual');
    }

    if (dto.paymentType === PaymentType.DEPOSIT && booking.depositPaid) {
      throw new BadRequestException('La sena de esta reserva ya fue pagada');
    }

    if (dto.paymentType === PaymentType.DEPOSIT && dto.amount !== booking.depositAmount) {
      throw new BadRequestException(`El monto de sena esperado es ${booking.depositAmount}`);
    }

    return this.paymentRepository.create({
      bookingId,
      amount: dto.amount,
      paymentType: dto.paymentType,
      method: dto.method,
      transactionReference: dto.transactionReference,
      notes: dto.notes,
    });
  }

  async uploadProof(
    paymentId: string,
    clientId: string,
    file: Express.Multer.File,
  ): Promise<PaymentEntity> {
    this.validateProofFile(file);

    const payment = await this.getPaymentOrThrow(paymentId);
    if (payment.booking?.clientId !== clientId) {
      throw new ForbiddenException('No puedes subir comprobante para este pago');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Solo se puede subir comprobante a pagos pendientes');
    }

    const upload = await this.cloudinaryService.uploadImage(file, `payments/${payment.bookingId}`);
    return this.paymentRepository.uploadProof(paymentId, upload.url);
  }

  async getMyPayments(clientId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.findByClient(clientId);
  }

  async getBookingPayments(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<PaymentEntity[]> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Reserva con ID '${bookingId}' no encontrada`);
    }

    const isClient = booking.clientId === userId;
    const venue = await this.venueService.getVenueById(booking.venueId);
    const isVenueOwner = venue.canBeEditedBy(userId, userRole);

    if (!isClient && !isVenueOwner) {
      throw new ForbiddenException('No tienes permiso para ver los pagos de esta reserva');
    }

    return this.paymentRepository.findByBooking(bookingId);
  }

  async getPendingOwnerPayments(ownerId: string, userRole: UserRole): Promise<PaymentEntity[]> {
    if (userRole === UserRole.ADMIN) {
      return this.paymentRepository.findPendingByOwner(ownerId);
    }
    return this.paymentRepository.findPendingByOwner(ownerId);
  }

  async confirmPayment(
    paymentId: string,
    ownerId: string,
    userRole: UserRole,
    notes?: string,
  ): Promise<PaymentEntity> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (!payment.canBeConfirmed()) {
      throw new BadRequestException('Este pago no puede ser confirmado');
    }

    await this.assertCanManagePayment(payment, ownerId, userRole);
    return this.paymentRepository.confirm(paymentId, ownerId, notes);
  }

  async rejectPayment(
    paymentId: string,
    ownerId: string,
    userRole: UserRole,
    reason: string,
  ): Promise<PaymentEntity> {
    const payment = await this.getPaymentOrThrow(paymentId);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Solo se pueden rechazar pagos pendientes');
    }

    await this.assertCanManagePayment(payment, ownerId, userRole);
    return this.paymentRepository.reject(paymentId, reason);
  }

  private async getPaymentOrThrow(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Pago con ID '${paymentId}' no encontrado`);
    }
    return payment;
  }

  private async assertCanManagePayment(
    payment: PaymentEntity,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (!payment.booking) {
      throw new BadRequestException('El pago no tiene reserva asociada');
    }

    const venue = await this.venueService.getVenueById(payment.booking.venueId);
    if (!venue.canBeEditedBy(userId, userRole)) {
      throw new ForbiddenException('No tienes permiso para gestionar este pago');
    }
  }

  private validateProofFile(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('El comprobante es requerido');
    }

    if (!ALLOWED_PROOF_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido para el comprobante');
    }

    if (file.size > MAX_PROOF_FILE_SIZE) {
      throw new BadRequestException('El comprobante no puede exceder 5MB');
    }
  }
}
