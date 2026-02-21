import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [ConversationsModule, MessagesModule, UsersModule],
})
export class ControllersModule {}
