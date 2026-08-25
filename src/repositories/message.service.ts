import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Message } from '../database/entities/message.entity.js';
import { UpdateMessageDto } from '../models/update-message.dto.js';
import { MessageDto } from '../models/message.dto.js';
import { MessageDbo } from '../models/message.dbo.js';
import { OpenAiService, OpenAiToolDefinition } from './openai.service.js';
import { UserService } from './user.service.js';
import { McpProxyService } from './mcp-proxy.service.js';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private readonly openAiService: OpenAiService,
    private readonly userService: UserService,
    private readonly mcpProxyService: McpProxyService,
  ) {}

  async create(messageDbo: MessageDbo): Promise<MessageDto> {
    const message = this.messageRepository.create({
      external_id: messageDbo.external_id,
      conversation_id: messageDbo.conversation_id,
      author_user_id: messageDbo.author_user_id,
      content: messageDbo.content || null,
    });

    const savedMessage = await this.messageRepository.save(message);
    return this.toDto(savedMessage);
  }

  async createWithAiResponse(
    messageDbo: MessageDbo,
    conversationMessages: MessageDto[],
    accessToken?: string,
  ): Promise<MessageDto[]> {
    // Save user message
    const userMessage = await this.create(messageDbo);

    // Prepare messages for OpenAI
    const messagesForAi = conversationMessages.map((msg) => ({
      role: 'user', // All existing messages are from users, bot responses are separate
      content: msg.content || '',
    }));

    // Add the current user message
    messagesForAi.push({
      role: 'user',
      content: messageDbo.content || '',
    });

    // Give the model access to the tools exposed by configured MCP servers, calling them
    // with the requesting user's own token so downstream services enforce that user's
    // permissions rather than a blanket service credential.
    const { tools, executor } = await this.buildMcpTooling(accessToken);

    // Generate AI response
    const aiResponse = await this.openAiService.generateResponse(
      messagesForAi,
      { tools, onToolCall: executor },
    );

    // Get or create bot user based on provider, model ID, and model name
    const providerId = this.openAiService.getProviderId();
    const modelId = this.openAiService.getModelId();
    const modelName = this.openAiService.getModelName();
    const botUser = await this.userService.getOrCreateBotUser(providerId, modelId, modelName);

    // Create AI response message
    const aiMessageDbo: MessageDbo = {
      external_id: null,
      conversation_id: messageDbo.conversation_id,
      author_user_id: botUser.id,
      content: aiResponse,
    };

    const aiMessage = await this.create(aiMessageDbo);

    return [userMessage, aiMessage];
  }

  /**
   * Builds the OpenAI tool list and dispatcher for all configured MCP servers. Tool names
   * are qualified as `<serverId>__<toolName>` to keep tools from different servers from
   * colliding, and to let the executor route a call back to the right server.
   */
  private async buildMcpTooling(accessToken?: string): Promise<{
    tools: OpenAiToolDefinition[];
    executor: (name: string, args: Record<string, unknown>) => Promise<string>;
  }> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['authorization'] = `Bearer ${accessToken}`;
    }

    const servers = this.mcpProxyService.listConfiguredServers();
    const toolMap = new Map<string, { serverId: string; toolName: string }>();
    const tools: OpenAiToolDefinition[] = [];

    for (const server of servers) {
      const serverTools = await this.mcpProxyService.listTools(server.id, headers);
      for (const tool of serverTools) {
        const qualifiedName = `${server.id}__${tool.name}`
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 64);

        if (toolMap.has(qualifiedName)) {
          this.logger.warn(
            `Skipping MCP tool '${tool.name}' from server '${server.id}': qualified name '${qualifiedName}' collides with another tool`,
          );
          continue;
        }

        toolMap.set(qualifiedName, { serverId: server.id, toolName: tool.name });
        tools.push({
          name: qualifiedName,
          description: tool.description,
          parameters: tool.inputSchema ?? { type: 'object', properties: {} },
        });
      }
    }

    const executor = async (name: string, args: Record<string, unknown>): Promise<string> => {
      const target = toolMap.get(name);
      if (!target) {
        return `Unknown tool '${name}'`;
      }

      return this.mcpProxyService.callTool(target.serverId, target.toolName, args, headers);
    };

    return { tools, executor };
  }

  // ...existing code...


  async findByConversation(conversationId: string): Promise<MessageDto[]> {
    const messages = await this.messageRepository.find({
      where: { conversation_id: conversationId, deletion_time: IsNull() },
      order: { creation_time: 'ASC' },
    });

    return messages.map((m) => this.toDto(m));
  }

  async findOne(id: string): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    return message ? this.toDto(message) : null;
  }

  async findByExternalId(externalId: string): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { external_id: externalId, deletion_time: IsNull() },
    });

    return message ? this.toDto(message) : null;
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!message) {
      return null;
    }

    if (updateMessageDto.content !== undefined) {
      message.content = updateMessageDto.content;
    }

    const updatedMessage = await this.messageRepository.save(message);
    return this.toDto(updatedMessage);
  }

  async delete(id: string): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!message) {
      return false;
    }

    message.deletion_time = new Date();
    await this.messageRepository.save(message);
    return true;
  }

  private toDto(message: Message): MessageDto {
    return {
      id: message.id,
      external_id: message.external_id,
      conversation_id: message.conversation_id,
      author_user_id: message.author_user_id,
      content: message.content,
      creation_time: message.creation_time,
      deletion_time: message.deletion_time,
    };
  }
}
