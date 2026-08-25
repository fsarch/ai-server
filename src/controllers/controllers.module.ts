import { Module } from '@nestjs/common';
import { ConversationsModule } from './conversations/conversations.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { UsersModule } from './users/users.module.js';
import { McpProxyModule } from './mcp-proxy/mcp-proxy.module.js';

@Module({
  imports: [ConversationsModule, MessagesModule, UsersModule, McpProxyModule],
})
export class ControllersModule {}
