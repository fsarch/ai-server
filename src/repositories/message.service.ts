import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../database/entities/message.entity.js';
import { UpdateMessageDto } from '../models/update-message.dto.js';
import { MessageDto } from '../models/message.dto.js';
import { MessageDbo } from '../models/message.dbo.js';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
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

  async findByConversation(conversationId: string): Promise<MessageDto[]> {
    const messages = await this.messageRepository.find({
      where: { conversation_id: conversationId, deletion_time: null },
      order: { creation_time: 'ASC' },
    });

    return messages.map((m) => this.toDto(m));
  }

  async findOne(id: string): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { id, deletion_time: null },
    });

    return message ? this.toDto(message) : null;
  }

  async findByExternalId(externalId: string): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { external_id: externalId, deletion_time: null },
    });

    return message ? this.toDto(message) : null;
  }

  async update(
    id: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageDto | null> {
    const message = await this.messageRepository.findOne({
      where: { id, deletion_time: null },
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
      where: { id, deletion_time: null },
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
