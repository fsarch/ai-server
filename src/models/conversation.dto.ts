import { UserDto } from './user.dto.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ maxLength: 1024, nullable: true })
  external_id: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  owner_user_id: string | null;

  @ApiPropertyOptional({ type: () => UserDto, nullable: true })
  owner_user?: UserDto | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty()
  creation_time: Date;

  @ApiPropertyOptional({ nullable: true })
  deletion_time: Date | null;
}
