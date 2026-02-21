import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}

