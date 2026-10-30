import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

const toHttpException = (code: string): HttpException | null => {
  switch (code) {
    case 'P2002':
      return new ConflictException('Ya existe un registro con esos datos');
    case 'P2003':
      return new ConflictException('El registro esta relacionado con otros datos');
    case 'P2020':
      return new BadRequestException('Un valor excede el rango permitido');
    case 'P2025':
      return new NotFoundException('El registro ya no existe');
    default:
      return null;
  }
};

// Safety net for what a service's own checks can't see: two requests racing past the same check
// (a duplicate name, a row deleted in between), or a value only the database knows is too big.
// Those are the client's or the timing's fault, not a server failure, so they shouldn't look like
// a 500. Anything else keeps Nest's generic 500, which never exposes Prisma's message.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('PrismaException');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const httpException = toHttpException(exception.code);
    if (!httpException) {
      super.catch(exception, host);
      return;
    }
    this.logger.warn(`${exception.code} mapped to ${httpException.getStatus()}`);
    super.catch(httpException, host);
  }
}
