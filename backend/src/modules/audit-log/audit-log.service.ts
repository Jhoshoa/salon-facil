import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, AuditTargetType } from './audit-log-actions';

export interface RecordAuditLogParams {
  adminId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  adminId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}

export interface ListAuditLogParams {
  adminId?: string;
  targetType?: string;
  action?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget by design, same as the notification `notify()` helper used across the
   * payment/booking/review services -- recording the trail must never block or roll back the
   * admin action it's documenting.
   */
  record(params: RecordAuditLogParams): void {
    this.prisma.adminAuditLog
      .create({
        data: {
          adminId: params.adminId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          metadata: params.metadata as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((error: Error) => {
        this.logger.error(`Failed to record audit log entry for ${params.action}`, error.stack);
      });
  }

  async findMany(params: ListAuditLogParams): Promise<{ items: AuditLogEntry[]; total: number }> {
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(params.adminId && { adminId: params.adminId }),
      ...(params.targetType && { targetType: params.targetType }),
      ...(params.action && { action: params.action }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: { admin: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        adminId: row.adminId,
        adminName: row.admin?.fullName ?? null,
        adminEmail: row.admin?.email ?? null,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      total,
    };
  }
}
