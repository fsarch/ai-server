import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from '../../repositories/message.service.js';
import { CreateMessageDto } from '../../models/create-message.dto.js';
import { UpdateMessageDto } from '../../models/update-message.dto.js';
import { MessageDto } from '../../models/message.dto.js';
import { CreateMessageResponseDto } from '../../models/create-message-response.dto.js';
import { AuthUserSyncService } from '../../repositories/auth-user-sync.service.js';
import { ConversationService } from '../../repositories/conversation.service.js';
import { UserData } from '../../fsarch/auth/decorators/user-data.decorator.js';
import { User } from '../../fsarch/auth/user.js';
import { MessageDbo } from '../../models/message.dbo.js';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('messages')
@Controller({
  path: 'conversations/:conversationId/messages',
  version: '1',
})
@ApiBearerAuth()
export class MessagesController {
  constructor(
    private readonly messageService: MessageService,
    private readonly authUserSyncService: AuthUserSyncService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create message and get AI response' })
  @ApiResponse({
    status: 201,
    description: 'Message created with AI response',
    type: CreateMessageResponseDto,
  })
  async create(
    @Param('conversationId') conversationId: string,
    @Body() createMessageDto: CreateMessageDto,
    @UserData() user: User,
  ): Promise<CreateMessageResponseDto> {
    let author_user_id = createMessageDto.author_user_id;

    // Get or create user from token claims if not explicitly provided
    if (!author_user_id && user.getClaims()) {
      const syncedUser = await this.authUserSyncService.syncUserFromClaims(
        user.getClaims()!,
      );
      if (syncedUser) {
        author_user_id = syncedUser.id;
      }
    }

    const messageDbo: MessageDbo = {
      external_id: createMessageDto.external_id ?? null,
      conversation_id: conversationId,
      author_user_id: author_user_id ?? null,
      content: createMessageDto.content ?? null,
    };

    // Check if conversation exists
    const conversation = await this.conversationService.findOne(conversationId);
    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    // Always generate AI response
    const conversationMessages = await this.messageService.findByConversation(conversationId);
    const messages = await this.messageService.createWithAiResponse(
      messageDbo,
      conversationMessages,
    );

    return { data: messages };
  }

  @Get()
  async findByConversation(@Param('conversationId') conversationId: string): Promise<MessageDto[]> {
    return this.messageService.findByConversation(conversationId);
  }

  @Get(':messageId')
  async findOne(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ): Promise<MessageDto> {
    const message = await this.messageService.findOne(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }
    return message;
  }

  @Put(':messageId')
  @ApiOperation({ summary: 'Update message' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated', type: MessageDto })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async update(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ): Promise<MessageDto> {
    const message = await this.messageService.findOne(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }

    const updatedMessage = await this.messageService.update(messageId, updateMessageDto);
    if (!updatedMessage) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }
    return updatedMessage;
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete message' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async delete(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    const msg = await this.messageService.findOne(messageId);
    if (!msg || msg.conversation_id !== conversationId) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }

    const deleted = await this.messageService.delete(messageId);
    if (!deleted) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Message deleted successfully' };
  }
}
