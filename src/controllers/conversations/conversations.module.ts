import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../../repositories/repositories.module.js';
import { ConversationsController } from './conversations.controller.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [ConversationsController],
})
export class ConversationsModule {}

