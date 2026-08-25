import { Module } from '@nestjs/common';
import { McpProxyController } from './mcp-proxy.controller.js';
import { RepositoriesModule } from '../../repositories/repositories.module.js';

@Module({
  imports: [RepositoriesModule],
  controllers: [McpProxyController],
})
export class McpProxyModule {}

