import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module.js';
import { MessagesController } from './messages.controller.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [MessagesController],
})
export class MessagesModule {}

