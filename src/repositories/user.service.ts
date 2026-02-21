import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      where: { deletion_time: null },
      order: { creation_time: 'DESC' },
    });

    return users.map((u) => this.toDto(u));
  }

  async findOne(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id, deletion_time: null },
    });

    return user ? this.toDto(user) : null;
  }

  async findByExternalId(externalId: string): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { external_id: externalId, deletion_time: null },
    });

    return user ? this.toDto(user) : null;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id, deletion_time: null },
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
      where: { id, deletion_time: null },
    });

    if (!user) {
      return false;
    }

    user.deletion_time = new Date();
    await this.userRepository.save(user);
    return true;
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      external_id: user.external_id,
      family_name: user.family_name,
      given_name: user.given_name,
      short_name: user.short_name,
      creation_time: user.creation_time,
      deletion_time: user.deletion_time,
    };
  }
}

