import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNERSHIP_KEY, OwnershipOptions } from '../decorators/ownership.decorator';
import { UserRole } from '../../modules/auth/domain/entities/user.entity';

interface AuthenticatedRequest {
  user?: {
    id: string;
    role: UserRole | string;
  };
  params: Record<string, unknown>;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
}

/**
 * Only activates on routes decorated with @Ownership() — none exist yet, so this guard is
 * currently a no-op everywhere. It compares `request[source][field]` directly against the
 * authenticated user's id, which only works when the owner id IS the route param/body value
 * (e.g. a user editing their own `/users/:userId`). It cannot resolve ownership for entities
 * like venues/bookings where the param is the resource's own id and the owner id requires a
 * DB lookup — those are enforced manually in the service layer instead
 * (see `VenueEntity.canBeEditedBy`, `BookingEntity`/`PaymentService` equivalents).
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<Required<OwnershipOptions>>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acceso denegado: no hay usuario autenticado');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const source = request[options.source] ?? {};
    const ownerId = source[options.field];

    if (!ownerId || String(ownerId) !== user.id) {
      throw new ForbiddenException('Acceso denegado: recurso de otro usuario');
    }

    return true;
  }
}
