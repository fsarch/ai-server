import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [UsersController],
})
export class UsersModule {}

