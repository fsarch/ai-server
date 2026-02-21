import { IsString, IsOptional, MaxLength, MinLength, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMessageDto } from './create-message.dto.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  external_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  owner_user_id?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: () => CreateMessageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMessageDto)
  initial_message?: CreateMessageDto;
}
