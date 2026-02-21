import { UserDto } from './user.dto.js';

export class MessageDto {
  id: string;
  external_id: string | null;
  conversation_id: string;
  author_user_id: string | null;
  author_user?: UserDto | null;
  content: string | null;
  creation_time: Date;
  deletion_time: Date | null;
}
