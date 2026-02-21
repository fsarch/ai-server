import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity.js';
import { CreateConversationDto } from '../models/create-conversation.dto.js';
import { UpdateConversationDto } from '../models/update-conversation.dto.js';
import { ConversationDto } from '../models/conversation.dto.js';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
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
      where: { deletion_time: null },
      order: { creation_time: 'DESC' },
    });

    return conversations.map((c) => this.toDto(c));
  }

  async findAllVisible(ownerUserId: string | null): Promise<ConversationDto[]> {
    const where = ownerUserId
      ? [
          { deletion_time: null, owner_user_id: null },
          { deletion_time: null, owner_user_id: ownerUserId },
        ]
      : [{ deletion_time: null, owner_user_id: null }];

    const conversations = await this.conversationRepository.find({
      where,
      order: { creation_time: 'DESC' },
    });

    return conversations.map((c) => this.toDto(c));
  }

  async findOne(id: string): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, deletion_time: null },
    });

    return conversation ? this.toDto(conversation) : null;
  }

  async findByExternalId(externalId: string): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { external_id: externalId, deletion_time: null },
    });

    return conversation ? this.toDto(conversation) : null;
  }

  async update(
    id: string,
    updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationDto | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, deletion_time: null },
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
      where: { id, deletion_time: null },
    });

    if (!conversation) {
      return false;
    }

    conversation.deletion_time = new Date();
    await this.conversationRepository.save(conversation);
    return true;
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
