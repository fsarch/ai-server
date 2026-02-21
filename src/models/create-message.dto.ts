import { IsString, IsOptional, MinLength, MaxLength, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  external_id?: string;

  @IsOptional()
  @IsUUID()
  author_user_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}
