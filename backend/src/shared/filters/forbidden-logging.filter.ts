import { ArgumentsHost, Catch, ForbiddenException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';

// Logs every 403 with who/what/where, then hands off to Nest's default handling for the
// actual HTTP response — this only adds an audit trail, it doesn't change what the client sees.
// Registered globally (see app.module.ts) so every ForbiddenException thrown anywhere — guards,
// or a service's own ownership check like venue.canBeEditedBy() — gets one consistent log line,
// instead of each of the dozen or so call sites needing its own Logger.warn().
@Catch(ForbiddenException)
export class ForbiddenLoggingFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('AccessDenied');

  catch(exception: ForbiddenException, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    this.logger.warn(
      `403 ${request.method} ${request.url} — user: ${request.user?.id ?? 'anonymous'}`,
    );
    super.catch(exception, host);
  }
}
