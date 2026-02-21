import { UserDto } from './user.dto.js';

export class ConversationDto {
  id: string;
  external_id: string | null;
  owner_user_id: string | null;
  owner_user?: UserDto | null;
  name: string | null;
  description: string | null;
  creation_time: Date;
  deletion_time: Date | null;
}
