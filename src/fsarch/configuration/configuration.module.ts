import { Module } from '@nestjs/common';
import configuration from './configuration.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
  ],
  providers: [],
})
export class ConfigurationModule {}
