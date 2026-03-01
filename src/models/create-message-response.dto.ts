import { ApiProperty } from '@nestjs/swagger';
import { MessageDto } from './message.dto.js';

export class CreateMessageResponseDto {
  @ApiProperty({
    type: [MessageDto],
    description: 'Array of created messages (user message and AI response)',
  })
  data: MessageDto[];
}

