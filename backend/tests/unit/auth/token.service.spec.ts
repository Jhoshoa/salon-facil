import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../../src/modules/auth/application/services/token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-access-secret-min-32-characters-long!',
        JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters!',
      };
      return config[key];
    }),
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      (jwtService.sign as jest.Mock)
        .mockReturnValueOnce('access-token-abc')
        .mockReturnValueOnce('refresh-token-xyz');

      const result = service.generateTokens({
        sub: 'user-123',
        email: 'test@email.com',
        role: 'CLIENT',
      });

      expect(result.accessToken).toBe('access-token-abc');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(result.expiresIn).toBe(900); // 15 minutes in seconds
      expect(jwtService.sign).toHaveBeenCalledTimes(2);

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: 'user-123', email: 'test@email.com', role: 'CLIENT', type: 'access' },
        expect.objectContaining({ secret: expect.any(String), expiresIn: '15m' }),
      );

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: 'user-123',
          email: 'test@email.com',
          role: 'CLIENT',
          type: 'refresh',
          jti: expect.any(String),
        },
        expect.objectContaining({ secret: expect.any(String), expiresIn: '7d' }),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return payload for valid access token', () => {
      const payload = { sub: 'user-123', email: 'test@email.com', role: 'CLIENT', type: 'access' };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const result = service.verifyAccessToken('valid-token');
      expect(result).toEqual(payload);
    });

    it('should throw for invalid token', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt verify error');
      });

      expect(() => service.verifyAccessToken('invalid-token')).toThrow(UnauthorizedException);
    });

    it('should throw when token type is refresh instead of access', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@email.com',
        role: 'CLIENT',
        type: 'refresh',
        jti: 'refresh-jti',
      };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      expect(() => service.verifyAccessToken('refresh-as-access')).toThrow(UnauthorizedException);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return payload for valid refresh token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@email.com',
        role: 'CLIENT',
        type: 'refresh',
        jti: 'refresh-jti',
      };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const result = service.verifyRefreshToken('valid-refresh');
      expect(result).toEqual(payload);
    });

    it('should throw for invalid refresh token', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt verify error');
      });

      expect(() => service.verifyRefreshToken('invalid')).toThrow(UnauthorizedException);
    });

    it('should throw when token type is access instead of refresh', () => {
      const payload = { sub: 'user-123', email: 'test@email.com', role: 'CLIENT', type: 'access' };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      expect(() => service.verifyRefreshToken('access-as-refresh')).toThrow(UnauthorizedException);
    });
  });
});
