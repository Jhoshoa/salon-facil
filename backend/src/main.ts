import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// compression and cookie-parser export CommonJS callable functions; default import compiles but
// fails at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import compression = require('compression');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());
  // Populates req.cookies before any guard/controller runs — required for the httpOnly-cookie
  // JWT auth (see modules/auth/infrastructure/strategies/jwt.strategy.ts).
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api/v1');

  // Publicly exposes every route, DTO shape, and which endpoints require auth — fine for
  // local/staging, not something to hand to an unauthenticated visitor in production.
  const swaggerEnabled = process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('SalónFácil API')
      .setDescription('API para la plataforma de alquiler de locales para eventos')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
}

void bootstrap();
