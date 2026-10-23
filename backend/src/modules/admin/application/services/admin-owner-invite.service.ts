import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationType } from '@prisma/client';
import {
  AUTH_REPOSITORY,
  IAuthRepository,
  PendingOwnerInvite,
} from '../../../auth/domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../../auth/domain/entities/user.entity';
import { AuthService } from '../../../auth/application/services/auth.service';
import { VenueService } from '../../../venue/application/services/venue.service';
import { VenueEntity } from '../../../venue/domain/entities/venue.entity';
import { NotificationService } from '../../../notification/application/services/notification.service';
import type { NotificationEmailMetadata } from '../../../notification/infrastructure/templates/notification-email.templates';
import { AuditLogService } from '../../../audit-log/audit-log.service';
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from '../../../audit-log/audit-log-actions';
import { CreateOwnerInviteDto, OwnerInviteContactDto } from '../dto/create-owner-invite.dto';
import { AdminOwnerInviteQueryDto } from '../dto/admin-owner-invite-query.dto';
import { AssignVenueOwnerDto } from '../dto/assign-venue-owner.dto';

@Injectable()
export class AdminOwnerInviteService {
  private readonly logger = new Logger(AdminOwnerInviteService.name);

  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository,
    private readonly authService: AuthService,
    private readonly venueService: VenueService,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  /** Finds-or-creates the OWNER account a venue should belong to, given contact info collected
   * over a call. Shared by createPlaceholderOwnerAndVenue (brand new venue) and
   * assignOwnerAndSendInvite (existing venue, attaching a real owner to it). */
  private async resolveOwnerAccount(
    contact: OwnerInviteContactDto,
    venueName: string,
    adminId: string,
  ): Promise<UserEntity> {
    const existing = await this.authRepository.findByEmail(contact.email);

    if (!existing) {
      const owner = await this.authRepository.create({
        email: contact.email,
        phone: contact.phone,
        fullName: contact.fullName,
        role: UserRole.OWNER,
        status: UserStatus.PENDING_VERIFICATION,
      });
      this.auditLogService.record({
        adminId,
        action: AUDIT_ACTION.ADMIN_CREATED_PLACEHOLDER_OWNER,
        targetType: AUDIT_TARGET_TYPE.USER,
        targetId: owner.id,
        metadata: { email: owner.email, venueName },
      });
      return owner;
    }

    if (existing.role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Ese email pertenece a una cuenta de administrador — resolvelo manualmente',
      );
    }

    if (existing.role === UserRole.CLIENT) {
      // El dueno ya habia buscado locales como cliente antes de que lo llamaramos -- le subimos
      // el rol en vez de fallar por el email unico, pero igual tiene que confirmar por el link
      // (nunca asumimos el consentimiento solo porque el email coincide).
      const owner = await this.authRepository.updateRole(existing.id, UserRole.OWNER);
      this.auditLogService.record({
        adminId,
        action: AUDIT_ACTION.OWNER_ROLE_UPGRADED_ON_INVITE,
        targetType: AUDIT_TARGET_TYPE.USER,
        targetId: owner.id,
        metadata: { previousRole: UserRole.CLIENT, venueName },
      });
      return owner;
    }

    // Ya es OWNER -- mismo dueno, otro local cargado en una llamada distinta.
    return existing;
  }

  /** Creates (or reuses) the owner account for a phone-onboarded venue and the venue itself.
   * Does NOT send the invite — that's a separate step (sendInvite below) so the admin can keep
   * editing the venue (photos, amenities, hours) before the owner ever sees it. */
  async createPlaceholderOwnerAndVenue(
    dto: CreateOwnerInviteDto,
    adminId: string,
  ): Promise<{ owner: UserEntity; venue: VenueEntity }> {
    const owner = await this.resolveOwnerAccount(dto.owner, dto.venue.name, adminId);
    const venue = await this.venueService.createVenue(dto.venue, owner.id);
    return { owner, venue };
  }

  /** Attaches a real owner to a venue that already exists (created some other way, e.g. an
   * admin testing something directly) and sends the claim invite in one step. Only allowed
   * while the venue is still owned by an ADMIN account -- a venue genuinely owned by a claimed
   * OWNER is never silently reassigned out from under them from here. */
  async assignOwnerAndSendInvite(
    venueId: string,
    contact: AssignVenueOwnerDto,
    adminId: string,
  ): Promise<{ resent: boolean }> {
    const venue = await this.venueService.getVenueById(venueId);
    const currentOwner = await this.authRepository.findById(venue.ownerId);
    if (!currentOwner || currentOwner.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Este local ya tiene un dueño activo — no se puede reasignar desde aca',
      );
    }

    const owner = await this.resolveOwnerAccount(contact, venue.name, adminId);
    await this.venueService.reassignOwner(venueId, owner.id);
    return this.sendInvite(venueId, adminId);
  }

  /** Sends (or resends, invalidating whatever link was outstanding) the claim invite for a
   * venue's owner, on every channel we have contact info for -- WhatsApp as well as email,
   * since this flow exists precisely for owners who may not check email often. */
  async sendInvite(venueId: string, adminId: string): Promise<{ resent: boolean }> {
    const venue = await this.venueService.getVenueById(venueId);
    const owner = await this.venueService.getOwnerContact(venueId);
    if (!owner) {
      throw new NotFoundException('No se encontro el propietario de este local');
    }

    const { token, resent } = await this.authService.issueOwnerInviteToken(owner.id);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const previewUrl = `${frontendUrl}/preview/${token}`;

    const title = `Mira como quedo ${venue.name} en Mi Evento`;
    const content = `Hola ${owner.fullName}, cargamos tu local en Mi Evento. Mira como quedo y activa tu cuenta si queres administrarlo: ${previewUrl}`;

    this.notificationService
      .enqueue({
        userId: owner.id,
        type: NotificationType.VENUE_OWNER_INVITE,
        title,
        content,
        channel: NotificationChannel.EMAIL,
        recipientEmail: owner.email,
        metadata: {
          kind: 'venueOwnerInvite',
          ownerName: owner.fullName,
          venueName: venue.name,
          previewUrl,
        } satisfies NotificationEmailMetadata,
      })
      .catch((error: Error) => {
        this.logger.error(`Failed to enqueue owner-invite email for venue ${venueId}`, error.stack);
      });

    this.notificationService
      .enqueue({
        userId: owner.id,
        type: NotificationType.VENUE_OWNER_INVITE,
        title,
        content,
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: owner.phone,
      })
      .catch((error: Error) => {
        this.logger.error(
          `Failed to enqueue owner-invite WhatsApp for venue ${venueId}`,
          error.stack,
        );
      });

    this.auditLogService.record({
      adminId,
      action: resent ? AUDIT_ACTION.OWNER_INVITE_RESENT : AUDIT_ACTION.OWNER_INVITE_SENT,
      targetType: AUDIT_TARGET_TYPE.USER,
      targetId: owner.id,
      metadata: { venueId, venueName: venue.name },
    });

    return { resent };
  }

  async listPendingInvites(dto: AdminOwnerInviteQueryDto): Promise<{
    data: PendingOwnerInvite[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { items, total } = await this.authRepository.findPendingOwnerInvites({
      search: dto.search,
      page: dto.page,
      limit: dto.limit,
    });
    return {
      data: items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }
}
