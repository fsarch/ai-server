import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsUUID()
  owner_user_id?: string;


  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

