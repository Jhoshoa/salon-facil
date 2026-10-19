import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AdminAuditLogController } from './admin-audit-log.controller';

// Deliberately standalone (PrismaService only, available globally via PrismaModule) so any other
// module -- admin, venue, review, payment -- can import this one directly to log an admin action,
// without creating a dependency on AdminModule itself (which already depends on AuthModule).
@Module({
  controllers: [AdminAuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
