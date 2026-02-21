import { Conversation } from "./entities/conversation.entity.js";
import { Message } from "./entities/message.entity.js";
import { User } from "./entities/user.entity.js";
import { AddConversationMessageUser1771705598671 } from "./migrations/1771705598671-add-conversation-message-user.js";

export const DATABASE_OPTIONS = {
  entities: [
    Conversation,
    Message,
    User,
  ],
  migrations: [
    AddConversationMessageUser1771705598671,
  ],
};
