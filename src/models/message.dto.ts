import { UserDto } from './user.dto.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ maxLength: 1024, nullable: true })
  external_id: string | null;

  @ApiProperty({ format: 'uuid' })
  conversation_id: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  author_user_id: string | null;

  @ApiPropertyOptional({ type: () => UserDto, nullable: true })
  author_user?: UserDto | null;

  @ApiPropertyOptional({ nullable: true })
  content: string | null;

  @ApiProperty()
  creation_time: Date;

  @ApiPropertyOptional({ nullable: true })
  deletion_time: Date | null;
}
