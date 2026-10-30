import { HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from '../../../src/shared/filters/prisma-exception.filter';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Secret table and column details', {
    code,
    clientVersion: 'test',
  });

const run = (code: string) => {
  const reply = jest.fn();
  const filter = new PrismaExceptionFilter();
  (filter as unknown as { httpAdapterHost: HttpAdapterHost }).httpAdapterHost = {
    httpAdapter: {
      reply,
      isHeadersSent: () => false,
      getRequestMethod: () => 'GET',
      getRequestUrl: () => '/',
    },
  } as unknown as HttpAdapterHost;

  filter.catch(prismaError(code), {
    getArgByIndex: () => ({}),
    getArgs: () => [{}, {}],
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
  } as never);

  const [, body, status] = reply.mock.calls[0];
  return { body, status };
};

describe('PrismaExceptionFilter', () => {
  it.each([
    ['P2002', HttpStatus.CONFLICT],
    ['P2003', HttpStatus.CONFLICT],
    ['P2020', HttpStatus.BAD_REQUEST],
    ['P2025', HttpStatus.NOT_FOUND],
    ['P2010', HttpStatus.INTERNAL_SERVER_ERROR],
  ])('maps %s to %i without exposing the database message', (code, expected) => {
    const { body, status } = run(code);

    expect(status).toBe(expected);
    expect(JSON.stringify(body)).not.toContain('Secret');
  });
});
