import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ maxLength: 1024, nullable: true })
  external_id: string | null;

  @ApiProperty({ maxLength: 1024 })
  family_name: string;

  @ApiProperty({ maxLength: 1024 })
  given_name: string;

  @ApiProperty({ maxLength: 1024 })
  short_name: string;

  @ApiProperty()
  creation_time: Date;

  @ApiPropertyOptional({ nullable: true })
  deletion_time: Date | null;
}
