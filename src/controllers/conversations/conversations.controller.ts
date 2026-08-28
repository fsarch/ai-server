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
import { ConversationService } from '../../repositories/conversation.service.js';
import { CreateConversationDto } from '../../models/create-conversation.dto.js';
import { UpdateConversationDto } from '../../models/update-conversation.dto.js';
import { ConversationDto } from '../../models/conversation.dto.js';
import { AuthUserSyncService } from '../../repositories/auth-user-sync.service.js';
import { OpenAiService } from '../../repositories/openai.service.js';
import { UserData, User } from '@fsarch/server/auth';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { MessageService } from '../../repositories/message.service.js';
import { MessageDbo } from '../../models/message.dbo.js';
import { UserDto } from '../../models/user.dto.js';

@ApiTags('conversations')
@Controller({
  path: 'conversations',
  version: '1',
})
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly authUserSyncService: AuthUserSyncService,
    private readonly messageService: MessageService,
    private readonly openAiService: OpenAiService,
  ) {}

  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @UserData() user: User,
  ): Promise<ConversationDto> {
    let owner_user_id = createConversationDto.owner_user_id;

    // Get or create user from token claims if not explicitly provided
    if (!owner_user_id) {
      const syncedUser = await this.authUserSyncService.syncUserFromClaims(user);
      if (syncedUser) {
        owner_user_id = syncedUser.id;
      }
    }

    // Prepare conversation data
    let conversationData = {
      ...createConversationDto,
      owner_user_id,
    };

    // Generate name and description from initial message if not provided
    if (
      createConversationDto.initial_message?.content &&
      (!createConversationDto.name || !createConversationDto.description)
    ) {
      try {
        const generated = await this.openAiService.generateConversationTitleAndDescription(
          createConversationDto.initial_message.content,
        );

        conversationData.name = conversationData.name || generated.title;
        conversationData.description = conversationData.description || generated.description;
      } catch (error) {
        // If generation fails, continue without auto-generated values
        console.error('Failed to generate conversation title/description:', error);
      }
    }

    const conversation = await this.conversationService.create(conversationData);

    // Create initial message if provided
    if (createConversationDto.initial_message) {
      const initialMessage = createConversationDto.initial_message;
      let author_user_id = initialMessage.author_user_id;

      // Get or create user from token claims if not explicitly provided
      if (!author_user_id) {
        const syncedUser = await this.authUserSyncService.syncUserFromClaims(user);
        if (syncedUser) {
          author_user_id = syncedUser.id;
        }
      }

      const messageDbo: MessageDbo = {
        external_id: initialMessage.external_id ?? null,
        conversation_id: conversation.id,
        author_user_id: author_user_id ?? null,
        content: initialMessage.content ?? null,
      };

      // Always generate AI response to initial message
      await this.messageService.createWithAiResponse(
        messageDbo,
        [],
      );
    }

    return conversation;
  }

  @Get()
  async findAll(@UserData() user: User): Promise<ConversationDto[]> {
    const ownerUserId = await this.authUserSyncService.findUserIdFromClaims(user);

    return this.conversationService.findAllVisible(ownerUserId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ConversationDto> {
    const conversation = await this.conversationService.findOne(id);
    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return conversation;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation updated', type: ConversationDto })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDto> {
    const conversation = await this.conversationService.update(id, updateConversationDto);
    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return conversation;
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members (participants) of a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'List of conversation members', type: [UserDto] })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMembers(@Param('id') id: string): Promise<UserDto[]> {
    const conversation = await this.conversationService.findOne(id);
    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return this.conversationService.findMembers(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const deleted = await this.conversationService.delete(id);
    if (!deleted) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Conversation deleted successfully' };
  }
}
