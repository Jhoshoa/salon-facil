import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipGuard } from '../../../src/shared/guards/ownership.guard';
import { RolesGuard } from '../../../src/shared/guards/roles.guard';
import { UserRole } from '../../../src/modules/auth/domain/entities/user.entity';

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  }) as unknown as ExecutionContext;

describe('Auth guards', () => {
  describe('RolesGuard', () => {
    it('allows users with a required role', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue([UserRole.OWNER]),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const context = createContext({ user: { id: 'owner-1', role: UserRole.OWNER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException for users without a required role', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue([UserRole.OWNER]),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      const context = createContext({ user: { id: 'client-1', role: UserRole.CLIENT } });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('OwnershipGuard', () => {
    it('allows users who own the requested resource', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue({ source: 'params', field: 'userId' }),
      } as unknown as Reflector;
      const guard = new OwnershipGuard(reflector);
      const context = createContext({
        user: { id: 'user-1', role: UserRole.CLIENT },
        params: { userId: 'user-1' },
        body: {},
        query: {},
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('allows admins to access owned resources', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue({ source: 'params', field: 'userId' }),
      } as unknown as Reflector;
      const guard = new OwnershipGuard(reflector);
      const context = createContext({
        user: { id: 'admin-1', role: UserRole.ADMIN },
        params: { userId: 'user-1' },
        body: {},
        query: {},
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException for resources owned by another user', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue({ source: 'params', field: 'userId' }),
      } as unknown as Reflector;
      const guard = new OwnershipGuard(reflector);
      const context = createContext({
        user: { id: 'user-1', role: UserRole.CLIENT },
        params: { userId: 'user-2' },
        body: {},
        query: {},
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
