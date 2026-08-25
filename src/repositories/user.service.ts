import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../database/entities/user.entity.js';
import { CreateUserDto } from '../models/create-user.dto.js';
import { UpdateUserDto } from '../models/update-user.dto.js';
import { UserDto } from '../models/user.dto.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const user = this.userRepository.create({
      external_id: createUserDto.external_id,
      family_name: createUserDto.family_name,
      given_name: createUserDto.given_name,
      short_name: createUserDto.short_name,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toDto(savedUser);
  }

  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.find({
      where: { deletion_time: IsNull() },
      order: { creation_time: 'DESC' },
    });

    return users.map((u) => this.toDto(u));
  }

  async findOne(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    return user ? this.toDto(user) : null;
  }

  async findByExternalId(externalId: string): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { external_id: externalId, deletion_time: IsNull() },
    });

    return user ? this.toDto(user) : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!user) {
      return null;
    }

    if (updateUserDto.family_name !== undefined) {
      user.family_name = updateUserDto.family_name;
    }

    if (updateUserDto.given_name !== undefined) {
      user.given_name = updateUserDto.given_name;
    }

    if (updateUserDto.short_name !== undefined) {
      user.short_name = updateUserDto.short_name;
    }

    const updatedUser = await this.userRepository.save(user);
    return this.toDto(updatedUser);
  }

  async delete(id: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id, deletion_time: IsNull() },
    });

    if (!user) {
      return false;
    }

    user.deletion_time = new Date();
    await this.userRepository.save(user);
    return true;
  }

  async getOrCreateBotUser(providerId: string, modelId: string, modelName: string): Promise<User> {
    // Generate unique external_id for the bot user (based on provider and model ID)
    // This stays stable even if the model name changes in config
    const external_id = `bot:${providerId}:${modelId}`;

    // Try to find existing bot user
    const existingUser = await this.userRepository.findOne({
      where: { external_id, is_bot: true, deletion_time: IsNull() },
    });

    if (existingUser) {
      // Update name if it changed in config
      if (existingUser.short_name !== modelName) {
        existingUser.short_name = modelName;
        return this.userRepository.save(existingUser);
      }
      return existingUser;
    }

    // Create new bot user
    const botUser = this.userRepository.create({
      external_id,
      family_name: providerId,
      given_name: modelId,
      short_name: modelName,
      is_bot: true,
    });

    return this.userRepository.save(botUser);
  }

  private toDto(user: User): UserDto {
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
}

