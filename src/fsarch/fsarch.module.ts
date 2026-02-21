import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module.js';
import { UacModule } from './uac/uac.module.js';
import {
  DatabaseModule,
  DatabaseModuleOptions,
} from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';

type FSArchOptions = {
  auth?: {};
  uac?: {
    roles: Array<string>;
  };
  database?: DatabaseModuleOptions;
};

@Global()
@Module({
  imports: [ConfigurationModule],
})
export class FsarchModule {
  static register(options: FSArchOptions): DynamicModule {
    const exports: DynamicModule['exports'] = [];
    const imports: DynamicModule['imports'] = [ConfigurationModule];
    if (options.auth) {
      imports.push(AuthModule);
      exports.push(AuthModule);
    }

    if (options.uac) {
      imports.push(UacModule.register(options.uac));
    }

    if (options.database) {
      imports.push(DatabaseModule.register(options.database));
    }

    return {
      module: FsarchModule,
      imports,
      exports,
    };
  }
}
