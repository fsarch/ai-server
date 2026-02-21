import { Module } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { ModuleConfiguration } from '../configuration/module/module-configuration.module.js';
import { ModuleConfigurationService } from '../configuration/module/module-configuration.service.js';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DATABASE_CONFIG_VALIDATOR } from './database-config.validator.js';
import { ConfigDatabaseType } from '../configuration/config.type.js';
import { EntitySchema } from 'typeorm';

export type DatabaseModuleOptions = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  migrations: Array<Function>;
  entities: Array<Function | EntitySchema>;
};

@Module({})
export class DatabaseModule {
  static register(options: DatabaseModuleOptions) {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [
            ModuleConfiguration.register('DATABASE_CONFIG', {
              validationSchema: DATABASE_CONFIG_VALIDATOR,
              name: 'database',
            }),
          ],
          inject: ['DATABASE_CONFIG'],
          useFactory: async (
            databaseConfigService: ModuleConfigurationService<ConfigDatabaseType>,
          ): Promise<TypeOrmModuleOptions> => {
            const databaseConfig = databaseConfigService.get();
            const baseConfig: TypeOrmModuleOptions = {
              migrations: options.migrations,
              entities: options.entities,
              migrationsRun: true,
              synchronize: false,
              logging: ['query', 'error'],
            };

            if (databaseConfig.type === 'sqlite') {
              return {
                type: databaseConfig.type,
                database: databaseConfig.database,
                ...baseConfig,
              } as TypeOrmModuleOptions;
            }

            if (
              databaseConfig.type === 'cockroachdb' ||
              databaseConfig.type === 'postgres'
            ) {
              const sslOptions: Partial<{
                rejectUnauthorized: boolean;
                ca: string | Buffer;
                cert: string | Buffer;
                key: string | Buffer;
              }> = {};

              if (databaseConfig.ssl) {
                if (databaseConfig.ssl.rejectUnauthorized === false) {
                  sslOptions.rejectUnauthorized =
                    databaseConfig.ssl.rejectUnauthorized;
                }

                if (databaseConfig.ssl.ca) {
                  if (typeof databaseConfig.ssl.ca === 'string') {
                    sslOptions.ca = databaseConfig.ssl.ca;
                  } else {
                    sslOptions.ca = await readFile(databaseConfig.ssl.ca.path);
                  }
                }

                if (databaseConfig.ssl.cert) {
                  if (typeof databaseConfig.ssl.cert === 'string') {
                    sslOptions.cert = databaseConfig.ssl.cert;
                  } else {
                    sslOptions.cert = await readFile(
                      databaseConfig.ssl.cert.path,
                    );
                  }
                }

                if (databaseConfig.ssl.key) {
                  if (typeof databaseConfig.ssl.key === 'string') {
                    sslOptions.key = databaseConfig.ssl.key;
                  } else {
                    sslOptions.key = await readFile(
                      databaseConfig.ssl.key.path,
                    );
                  }
                }
              }

              return {
                type: databaseConfig.type,
                database: databaseConfig.database,
                host: databaseConfig.host,
                username: databaseConfig.username,
                password: databaseConfig.password,
                port: databaseConfig.port ?? 26257,
                ssl: databaseConfig.ssl ? sslOptions : undefined,
                ...baseConfig,
              } as TypeOrmModuleOptions;
            }
          },
        }),
      ],
    };
  }
}
