import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';

export interface OwnershipOptions {
  source?: 'params' | 'body' | 'query';
  field?: string;
}

export const Ownership = (options: OwnershipOptions = {}) =>
  SetMetadata(OWNERSHIP_KEY, {
    source: options.source ?? 'params',
    field: options.field ?? 'userId',
  });
