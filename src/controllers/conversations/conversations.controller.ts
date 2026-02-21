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
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from '../../repositories/conversation.service.js';
import { CreateConversationDto } from '../../models/create-conversation.dto.js';
import { UpdateConversationDto } from '../../models/update-conversation.dto.js';
import { ConversationDto } from '../../models/conversation.dto.js';
import { AuthUserSyncService } from '../../repositories/auth-user-sync.service.js';
import { UserData } from '../../fsarch/auth/decorators/user-data.decorator.js';
import { User } from '../../fsarch/auth/user.js';
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

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
  ) {}

  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @UserData() user: User,
  ): Promise<ConversationDto> {
    let owner_user_id = createConversationDto.owner_user_id;

    // Get or create user from token claims if not explicitly provided
    if (!owner_user_id && user.getClaims()) {
      const syncedUser = await this.authUserSyncService.syncUserFromClaims(
        user.getClaims()!,
      );
      if (syncedUser) {
        owner_user_id = syncedUser.id;
      }
    }

    // Add owner_user_id to the conversation
    const dtoWithOwner = {
      ...createConversationDto,
      owner_user_id,
    };

    return this.conversationService.create(dtoWithOwner);
  }

  @Get()
  async findAll(@UserData() user: User): Promise<ConversationDto[]> {
    const claims = user.getClaims();
    const ownerUserId = claims
      ? await this.authUserSyncService.findUserIdFromClaims(claims)
      : null;

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

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    const deleted = await this.conversationService.delete(id);
    if (!deleted) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Conversation deleted successfully' };
  }
}
