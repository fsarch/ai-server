import { DatabaseType } from 'typeorm';

const DATA_TYPES: Record<
  'timestamp' | 'boolean' | 'smallint',
  Record<'cockroachdb' | 'sqlite' | 'postgres', string>
> = {
  timestamp: {
    cockroachdb: 'TIMESTAMPTZ',
    postgres: 'TIMESTAMPTZ',
    sqlite: 'datetime',
  },
  boolean: {
    cockroachdb: 'BOOL',
    postgres: 'BOOL',
    sqlite: 'boolean',
  },
  smallint: {
    cockroachdb: 'INT2',
    postgres: 'INT2',
    sqlite: 'tinyint',
  },
};

export const getDataType = (
  driver: DatabaseType,
  dataType: keyof typeof DATA_TYPES,
) => {
  if (
    driver !== 'cockroachdb' &&
    driver !== 'postgres' &&
    driver !== 'sqlite'
  ) {
    throw new Error('unsupported database type');
  }

  return DATA_TYPES[dataType][driver];
};
