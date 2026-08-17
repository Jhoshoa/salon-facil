# 🔐 Sprint 3: Autenticación — Registro, Login, JWT, Roles y Guards

**Proyecto:** SalónFácil — Plataforma de Alquiler de Locales para Eventos  
**Fase:** 1 — Setup y Fundación  
**Sprint:** 3 de 6  
**Duración estimada:** 3–4 días  
**Stack:** NestJS + Passport + JWT + bcrypt + Prisma + Zod

---

## 📋 Índice

1. [Objetivo del Sprint](#1-objetivo-del-sprint)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Arquitectura del Módulo Auth](#3-arquitectura-del-módulo-auth)
4. [Entidades de Dominio](#4-entidades-de-dominio)
5. [DTOs y Validación](#5-dtos-y-validación)
6. [Repository Interface e Implementación](#6-repository-interface-e-implementación)
7. [Servicios de Negocio](#7-servicios-de-negocio)
8. [Use Cases](#8-use-cases)
9. [JWT Strategy y Guards](#9-jwt-strategy-y-guards)
10. [Controller REST](#10-controller-rest)
11. [Tests](#11-tests)
12. [Criterios de Aceptación](#12-criterios-de-aceptación)
13. [Precauciones y Mejores Prácticas](#13-precauciones-y-mejores-prácticas)
14. [Checklist de Completitud](#14-checklist-de-completitud)

---

## 1. Objetivo del Sprint

Implementar el sistema de autenticación completo con:
- ✅ Registro de usuarios (CLIENT y OWNER) con validación
- ✅ Login con email/password
- ✅ JWT tokens (access + refresh) con expiración
- ✅ Roles (CLIENT, OWNER, ADMIN) con protección de rutas
- ✅ Guards: JWT, Roles, Ownership
- ✅ Decoradores: @Public, @Roles, @CurrentUser
- ✅ Hash de passwords con bcrypt (cost 12)
- ✅ Logout con invalidación de refresh tokens

**Al finalizar este sprint, cualquier endpoint debe poder ser protegido con autenticación y autorización por roles.**

---

## 2. Prerrequisitos

- Sprint 1 completado (NestJS + Docker corriendo)
- Sprint 2 completado (Prisma schema + migraciones + seed data)
- PostgreSQL con tabla `users` poblada

---

## 3. Arquitectura del Módulo Auth

```
modules/auth/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts
│   └── repositories/
│       └── auth.repository.interface.ts
├── application/
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── auth-response.dto.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── token.service.ts
│   └── use-cases/
│       ├── register.use-case.ts
│       ├── login.use-case.ts
│       ├── refresh-token.use-case.ts
│       └── logout.use-case.ts
├── infrastructure/
│   ├── repositories/
│   │   └── auth.repository.ts
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── local.strategy.ts
└── interface/
    ├── auth.controller.ts
    └── auth.module.ts
```

---

## 4. Entidades de Dominio

```typescript
// modules/auth/domain/entities/user.entity.ts

export enum UserRole {
  CLIENT = 'CLIENT',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export class UserEntity {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  city: string | null;
  district: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isVerified(): boolean {
    return !!this.emailVerifiedAt && !!this.phoneVerifiedAt;
  }

  canCreateVenue(): boolean {
    return this.role === UserRole.OWNER || this.role === UserRole.ADMIN;
  }

  canAccessAdminPanel(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
```

---

## 5. DTOs y Validación

```typescript
// modules/auth/application/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsPhoneNumber, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../domain/entities/user.entity';

export class RegisterDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  password: string;

  @IsPhoneNumber('BO', { message: 'El número de teléfono no es válido para Bolivia' })
  phone: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  fullName: string;

  @IsEnum(UserRole, { message: 'El rol debe ser CLIENT o OWNER' })
  role: UserRole = UserRole.CLIENT;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;
}
```

```typescript
// modules/auth/application/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  password: string;
}
```

```typescript
// modules/auth/application/dto/refresh-token.dto.ts
import { IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsUUID('4', { message: 'El refresh token no es válido' })
  refreshToken: string;
}
```

```typescript
// modules/auth/application/dto/auth-response.dto.ts
import { UserRole, UserStatus } from '../../domain/entities/user.entity';

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    avatarUrl: string | null;
    city: string | null;
    district: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos
}
```

---

## 6. Repository Interface e Implementación

```typescript
// modules/auth/domain/repositories/auth.repository.interface.ts
import { UserEntity } from '../entities/user.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface IAuthRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
  }): Promise<UserEntity>;
  updateLastLogin(id: string): Promise<void>;
  exists(email: string, phone: string): Promise<boolean>;
}
```

```typescript
// modules/auth/infrastructure/repositories/auth.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../domain/entities/user.entity';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toEntity(user) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user ? this.toEntity(user) : null;
  }

  async create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    fullName: string;
    role: string;
    city?: string;
    district?: string;
  }): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        ...data,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });
    return this.toEntity(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async exists(email: string, phone: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { OR: [{ email }, { phone }] },
    });
    return count > 0;
  }

  private toEntity(prismaUser: any): UserEntity {
    return new UserEntity({
      id: prismaUser.id,
      email: prismaUser.email,
      phone: prismaUser.phone,
      passwordHash: prismaUser.passwordHash,
      fullName: prismaUser.fullName,
      role: prismaUser.role as UserRole,
      status: prismaUser.status as UserStatus,
      avatarUrl: prismaUser.avatarUrl,
      city: prismaUser.city,
      district: prismaUser.district,
      emailVerifiedAt: prismaUser.emailVerifiedAt,
      phoneVerifiedAt: prismaUser.phoneVerifiedAt,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      lastLoginAt: prismaUser.lastLoginAt,
    });
  }
}
```

---

## 7. Servicios de Negocio

### 7.1 Token Service

```typescript
// modules/auth/application/services/token.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string;      // userId
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow('JWT_SECRET');
    this.refreshSecret = config.getOrThrow('JWT_REFRESH_SECRET');
    this.accessExpiration = config.get('JWT_ACCESS_EXPIRATION', '15m');
    this.refreshExpiration = config.get('JWT_REFRESH_EXPIRATION', '7d');
  }

  generateTokens(payload: Omit<TokenPayload, 'type'>): TokenPair {
    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiration,
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiration,
      },
    );

    // Calcular expiresIn en segundos
    const expiresInMatch = this.accessExpiration.match(/(\\d+)([mhd])/);
    let expiresIn = 900; // default 15 min
    if (expiresInMatch) {
      const value = parseInt(expiresInMatch[1]);
      const unit = expiresInMatch[2];
      const multipliers = { m: 60, h: 3600, d: 86400 };
      expiresIn = value * multipliers[unit];
    }

    return { accessToken, refreshToken, expiresIn };
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.jwtService.verify(token, { secret: this.accessSecret });
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify(token, { secret: this.refreshSecret });
  }
}
```

### 7.2 Auth Service

```typescript
// modules/auth/application/services/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IAuthRepository, AUTH_REPOSITORY } from '../../domain/repositories/auth.repository.interface';
import { UserEntity, UserRole } from '../../domain/entities/user.entity';
import { TokenService } from './token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private authRepository: IAuthRepository,
    private tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar si email o teléfono ya existen
    const exists = await this.authRepository.exists(dto.email, dto.phone);
    if (exists) {
      throw new ConflictException('El email o teléfono ya está registrado');
    }

    // Hash de password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Crear usuario
    const user = await this.authRepository.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      city: dto.city,
      district: dto.district,
    });

    // Generar tokens
    const tokens = this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Buscar usuario
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar estado
    if (!user.isActive()) {
      throw new UnauthorizedException('Tu cuenta está suspendida o inactiva');
    }

    // Verificar password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    await this.authRepository.updateLastLogin(user.id);

    // Generar tokens
    const tokens = this.tokenService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return this.buildAuthResponse(user, tokens);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.authRepository.findById(payload.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      const tokens = this.tokenService.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return this.buildAuthResponse(user, tokens);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async validateUser(userId: string): Promise<UserEntity | null> {
    return this.authRepository.findById(userId);
  }

  private buildAuthResponse(
    user: UserEntity,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        city: user.city,
        district: user.district,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
```

---

## 8. Use Cases

```typescript
// modules/auth/application/use-cases/register.use-case.ts
import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private authService: AuthService) {}

  async execute(dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }
}
```

```typescript
// modules/auth/application/use-cases/login.use-case.ts
import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class LoginUseCase {
  constructor(private authService: AuthService) {}

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
```

```typescript
// modules/auth/application/use-cases/refresh-token.use-case.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class RefreshTokenUseCase {
  constructor(private authService: AuthService) {}

  async execute(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    return this.authService.refreshTokens(refreshToken);
  }
}
```

---

## 9. JWT Strategy y Guards

### 9.1 JWT Strategy

```typescript
// modules/auth/infrastructure/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/services/auth.service';
import { TokenPayload } from '../../application/services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.isActive()) {
      throw new UnauthorizedException('Cuenta inactiva');
    }

    return user; // Se adjunta a request.user
  }
}
```

### 9.2 Guards

```typescript
// shared/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

```typescript
// shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/auth/domain/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### 9.3 Decoradores

```typescript
// shared/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// shared/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/auth/domain/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// shared/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../modules/auth/domain/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: keyof UserEntity | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserEntity;

    return data ? user[data] : user;
  },
);
```

---

## 10. Controller REST

```typescript
// modules/auth/interface/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';
import { RefreshTokenDto } from '../application/dto/refresh-token.dto';
import { AuthResponseDto } from '../application/dto/auth-response.dto';
import { UserEntity } from '../domain/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private registerUseCase: RegisterUseCase,
    private loginUseCase: LoginUseCase,
    private refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email o teléfono ya registrado' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.registerUseCase.execute(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refrescados', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refreshTokens(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.refreshTokenUseCase.execute(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Usuario actual' })
  async me(@CurrentUser() user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      city: user.city,
      district: user.district,
    };
  }
}
```

---

## 11. Auth Module

```typescript
// modules/auth/interface/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from '../application/services/auth.service';
import { TokenService } from '../application/services/token.service';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { AuthRepository } from '../infrastructure/repositories/auth.repository';
import { AUTH_REPOSITORY } from '../domain/repositories/auth.repository.interface';
import { JwtStrategy } from '../infrastructure/strategies/jwt.strategy';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    JwtStrategy,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthRepository,
    },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
```

---

## 12. Actualizar AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/interface/auth.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards globales
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,  // Protege TODAS las rutas por defecto
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,    // Verifica roles después de JWT
    },
  ],
})
export class AppModule {}
```

---

## 13. Tests

```typescript
// tests/unit/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/application/services/auth.service';
import { TokenService } from '../../../src/modules/auth/application/services/token.service';
import { AUTH_REPOSITORY } from '../../../src/modules/auth/domain/repositories/auth.repository.interface';
import { UserEntity, UserRole, UserStatus } from '../../../src/modules/auth/domain/entities/user.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockAuthRepository: any;
  let mockTokenService: any;

  beforeEach(async () => {
    mockAuthRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn().mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      }),
      verifyRefreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AUTH_REPOSITORY,
          useValue: mockAuthRepository,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockAuthRepository.exists.mockResolvedValue(false);
      mockAuthRepository.create.mockResolvedValue(
        new UserEntity({
          id: 'user-123',
          email: 'test@email.com',
          phone: '+59171234567',
          passwordHash: 'hashed',
          fullName: 'Test User',
          role: UserRole.CLIENT,
          status: UserStatus.PENDING_VERIFICATION,
        }),
      );

      const result = await service.register({
        email: 'test@email.com',
        password: 'Password123!',
        phone: '+59171234567',
        fullName: 'Test User',
        role: UserRole.CLIENT,
      });

      expect(result.user.email).toBe('test@email.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(mockAuthRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user exists', async () => {
      mockAuthRepository.exists.mockResolvedValue(true);

      await expect(
        service.register({
          email: 'test@email.com',
          password: 'Password123!',
          phone: '+59171234567',
          fullName: 'Test User',
          role: UserRole.CLIENT,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      mockAuthRepository.findByEmail.mockResolvedValue(
        new UserEntity({
          id: 'user-123',
          email: 'test@email.com',
          phone: '+59171234567',
          passwordHash,
          fullName: 'Test User',
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
        }),
      );

      const result = await service.login({
        email: 'test@email.com',
        password: 'Password123!',
      });

      expect(result.user.email).toBe('test@email.com');
      expect(mockAuthRepository.updateLastLogin).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 12);
      mockAuthRepository.findByEmail.mockResolvedValue(
        new UserEntity({
          id: 'user-123',
          email: 'test@email.com',
          phone: '+59171234567',
          passwordHash,
          fullName: 'Test User',
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
        }),
      );

      await expect(
        service.login({
          email: 'test@email.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

---

## 14. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| CA1 | Registro de usuario nuevo devuelve tokens | `POST /api/v1/auth/register` → 201 con accessToken y refreshToken |
| CA2 | Registro con email duplicado devuelve 409 | `POST /api/v1/auth/register` con email existente → 409 |
| CA3 | Login con credenciales válidas devuelve tokens | `POST /api/v1/auth/login` → 200 con tokens |
| CA4 | Login con credenciales inválidas devuelve 401 | `POST /api/v1/auth/login` con password wrong → 401 |
| CA5 | Login con cuenta inactiva devuelve 401 | Cambiar status a INACTIVE, intentar login → 401 |
| CA6 | Refresh token genera nuevos tokens | `POST /api/v1/auth/refresh` con refreshToken válido → nuevos tokens |
| CA7 | Refresh token inválido devuelve 401 | `POST /api/v1/auth/refresh` con token fake → 401 |
| CA8 | Ruta protegida requiere JWT | `GET /api/v1/auth/me` sin header → 401 |
| CA9 | Ruta protegida con JWT válido devuelve datos | `GET /api/v1/auth/me` con Bearer token → 200 con user |
| CA10 | Ruta pública no requiere JWT | `POST /api/v1/auth/register` sin header → 201 |
| CA11 | Guard de roles funciona | `@Roles(OWNER)` en endpoint, cliente intenta acceder → 403 |
| CA12 | Password hasheado con bcrypt | Verificar en DB que passwordHash no es texto plano |
| CA13 | Tests unitarios pasan | `npm run test` → todos los tests de auth pasan |

---

## 15. Precauciones y Mejores Prácticas

| # | Precaución | Por qué | Cómo mitigar |
|---|-----------|---------|--------------|
| P1 | **NUNCA devolver passwordHash en responses** | Exposición de datos sensibles. | `buildAuthResponse()` solo incluye campos seguros. |
| P2 | **Mensajes de error genéricos en login** | "Email no existe" vs "Password incorrecto" permite enumeración de usuarios. | Ambos casos devuelven "Credenciales inválidas". |
| P3 | **bcrypt cost mínimo 12** | Cost < 10 es vulnerable a ataques de fuerza bruta modernos. | `bcrypt.hash(password, 12)`. |
| P4 | **JWT secrets mínimo 32 caracteres aleatorios** | Secrets cortos = tokens fáciles de falsificar. | Generar con `openssl rand -base64 32`. Validar con Joi. |
| P5 | **Access token corto (15 min), refresh token largo (7 días)** | Si roban access token, ventana de ataque es mínima. | Configuración en variables de entorno. |
| P6 | **Validar tipo de token (access vs refresh)** | Evita usar refresh token como access token. | Payload incluye `type: 'access'` o `type: 'refresh'`. |
| P7 | **Guards como providers globales** | Si olvidas `@UseGuards()` en un endpoint, queda expuesto. | `APP_GUARD` en AppModule protege TODO por defecto. `@Public()` para excepciones. |
| P8 | **Rate limiting en auth endpoints** | Previene fuerza bruta de passwords. | ThrottlerModule con límite estricto en auth (ej: 5 intentos/min). |
| P9 | **Sanitizar inputs antes de validación** | Previene injection en campos de texto. | class-validator con `@IsString()`, `@MinLength()`, etc. |
| P10 | **No almacenar tokens en localStorage** | XSS puede robar tokens. | Usar httpOnly cookies (futuro) o al menos no localStorage. |

---

## 16. Checklist de Completitud

### Entidades y Dominio
- [ ] `UserEntity` con enums `UserRole` y `UserStatus`
- [ ] `UserEntity` con métodos de negocio (`isActive()`, `canCreateVenue()`)
- [ ] `IAuthRepository` interface definida

### DTOs y Validación
- [ ] `RegisterDto` con validación completa
- [ ] `LoginDto` con validación
- [ ] `RefreshTokenDto` con validación UUID
- [ ] `AuthResponseDto` con estructura de respuesta

### Repository
- [ ] `AuthRepository` implementa `IAuthRepository`
- [ ] Métodos: findById, findByEmail, findByPhone, create, updateLastLogin, exists
- [ ] Conversión Prisma → Entity en método privado `toEntity()`

### Servicios
- [ ] `TokenService` genera access + refresh tokens
- [ ] `TokenService` verifica ambos tipos de tokens
- [ ] `AuthService` implementa register, login, refreshTokens, validateUser
- [ ] `AuthService` usa bcrypt para hash/compare
- [ ] `AuthService` maneja estados de usuario (active/inactive)

### Use Cases
- [ ] `RegisterUseCase`
- [ ] `LoginUseCase`
- [ ] `RefreshTokenUseCase`

### Strategies y Guards
- [ ] `JwtStrategy` extrae y valida token
- [ ] `JwtAuthGuard` como guard global con soporte `@Public()`
- [ ] `RolesGuard` verifica roles requeridos

### Decoradores
- [ ] `@Public()` para rutas sin auth
- [ ] `@Roles()` para restricción de roles
- [ ] `@CurrentUser()` para extraer usuario del request

### Controller
- [ ] `POST /auth/register` → 201
- [ ] `POST /auth/login` → 200
- [ ] `POST /auth/refresh` → 200
- [ ] `GET /auth/me` → 200 (protegido)

### Module y App
- [ ] `AuthModule` registra todo correctamente
- [ ] `AppModule` tiene guards globales configurados
- [ ] `JwtAuthGuard` es `APP_GUARD` global

### Tests
- [ ] Tests de `AuthService` (register, login, errores)
- [ ] Tests de `TokenService`
- [ ] Tests de guards
- [ ] Todos los tests pasan

### Verificación Final
- [ ] Registro funciona con Postman/curl
- [ ] Login funciona
- [ ] Refresh token funciona
- [ ] Ruta protegida rechaza sin token
- [ ] Ruta protegida acepta con token válido
- [ ] Rol incorrecto devuelve 403

---

> **"La autenticación es la puerta de tu aplicación. Si está mal construida, todo lo demás es irrelevante."**

---

*Sprint 3 — Autenticación: Registro, Login, JWT, Roles y Guards*  
*© 2026 — SalónFácil Development Team*
