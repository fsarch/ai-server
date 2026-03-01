import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../database/entities/conversation.entity.js';
import { Message } from '../database/entities/message.entity.js';
import { User } from '../database/entities/user.entity.js';
import { ConversationService } from './conversation.service.js';
import { MessageService } from './message.service.js';
import { UserService } from './user.service.js';
import { AuthUserSyncService } from './auth-user-sync.service.js';
import { OpenAiService } from './openai.service.js';
import configuration from '../fsarch/configuration/configuration.js';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User])],
  providers: [
    ConversationService,
    MessageService,
    UserService,
    AuthUserSyncService,
    {
      provide: 'CONFIG',
      useValue: configuration(),
    },
    OpenAiService,
  ],
  exports: [ConversationService, MessageService, UserService, AuthUserSyncService, OpenAiService],
})
export class RepositoriesModule {}

