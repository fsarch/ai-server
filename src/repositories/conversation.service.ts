import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity.js';
import { CreateConversationDto } from '../models/create-conversation.dto.js';
import { UpdateConversationDto } from '../models/update-conversation.dto.js';
import { ConversationDto } from '../models/conversation.dto.js';
import { UserDto } from '../models/user.dto.js';
import { User } from '../database/entities/user.entity.js';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createConversationDto: CreateConversationDto): Promise<ConversationDto> {
    const conversation = this.conversationRepository.create({
      external_id: createConversationDto.external_id || null,
      owner_user_id: createConversationDto.owner_user_id || null,
      name: createConversationDto.name || null,
      description: createConversationDto.description || null,
    });

    const savedConversation = await this.conversationRepository.save(conversation);
    return this.toDto(savedConversation);
  }

  async findAll(): Promise<ConversationDto[]> {
    const conversations = await this.conversationRepository.find({
      where: { deletion_time: IsNull() },
      order: { creation_time: 'DESC' },
    });

    return conversations.map((c) => this.toDto(c));
  }

  async findAllVisible(ownerUserId: string | null): Promise<ConversationDto[]> {
    const where = ownerUserId
      ? [
          { deletion_time: IsNull(), owner_user_id: IsNull() },
          { deletion_time: IsNull(), owner_user_id: ownerUserId },
        ]
      : [{ deletion_time: IsNull(), owner_user_id: IsNull() }];

    const conversations = await this.conversationRepository.find({
      where,
      order: { creation_time: 'DESC' },
    });

    return conversations.map((c) => this.toDto(c));
  }

  async findOne(id: string): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    return conversation ? this.toDto(conversation) : null;
  }

  async findByExternalId(externalId: string): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { external_id: externalId, deletion_time: IsNull() },
    });

    return conversation ? this.toDto(conversation) : null;
  }

  async update(
    id: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!conversation) {
      return null;
    }

    if (updateConversationDto.owner_user_id !== undefined) {
      conversation.owner_user_id = updateConversationDto.owner_user_id;
    }


    if (updateConversationDto.name !== undefined) {
      conversation.name = updateConversationDto.name;
    }

    if (updateConversationDto.description !== undefined) {
      conversation.description = updateConversationDto.description;
    }

    const updatedConversation = await this.conversationRepository.save(conversation);
    return this.toDto(updatedConversation);
  }

  async delete(id: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!conversation) {
      return false;
    }

    conversation.deletion_time = new Date();
    await this.conversationRepository.save(conversation);
    return true;
  }

  async findMembers(conversationId: string): Promise<UserDto[]> {
    // Get all unique user IDs from messages in this conversation and the owner
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, deletion_time: IsNull() },
    });

    if (!conversation) {
      return [];
    }

    const userIds = new Set<string>();

    // Add owner if exists
    if (conversation.owner_user_id) {
      userIds.add(conversation.owner_user_id);
    }

    // Get all authors from messages in this conversation
    const result = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.messages', 'message')
      .select('DISTINCT message.author_user_id', 'author_user_id')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('message.deletion_time IS NULL')
      .andWhere('message.author_user_id IS NOT NULL')
      .getRawMany();

    result.forEach((row) => {
      if (row.author_user_id) {
        userIds.add(row.author_user_id);
      }
    });

    if (userIds.size === 0) {
      return [];
    }

    // Fetch all users
    const users = await this.userRepository.find({
      where: {
        id: In(Array.from(userIds)),
        deletion_time: IsNull(),
      },
    });

    return users.map((user) => this.toUserDto(user));
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      external_id: user.external_id,
      family_name: user.family_name,
      given_name: user.given_name,
      short_name: user.short_name,
      is_bot: user.is_bot,
      creation_time: user.creation_time,
      deletion_time: user.deletion_time,
    };
  }

  private toDto(conversation: Conversation): ConversationDto {
    return {
      id: conversation.id,
      external_id: conversation.external_id,
      owner_user_id: conversation.owner_user_id,
      name: conversation.name,
      description: conversation.description,
      creation_time: conversation.creation_time,
      deletion_time: conversation.deletion_time,
    };
  }
}
