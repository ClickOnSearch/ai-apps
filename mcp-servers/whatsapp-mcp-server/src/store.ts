export interface StoredMessage {
  chatId: string;
  fromMe: boolean;
  senderName?: string;
  text: string;
  timestamp: number;
}

export interface StoredContact {
  id: string;
  name?: string;
}

/**
 * In-memory only: Baileys doesn't persist chat/message history itself, and
 * this server only needs enough recall for the agent to answer "what did
 * they say" / "who is X" about activity seen since it started.
 */
export class WhatsAppStore {
  private messagesByChat = new Map<string, StoredMessage[]>();
  private contacts = new Map<string, StoredContact>();
  private readonly maxMessagesPerChat = 200;

  recordMessage(message: StoredMessage): void {
    const list = this.messagesByChat.get(message.chatId) ?? [];
    list.push(message);
    if (list.length > this.maxMessagesPerChat) list.shift();
    this.messagesByChat.set(message.chatId, list);
  }

  recordContact(id: string, name?: string): void {
    if (!name) return;
    this.contacts.set(id, { id, name });
  }

  listChats(): { chatId: string; name?: string; lastMessageAt?: number; messageCount: number }[] {
    return [...this.messagesByChat.entries()].map(([chatId, messages]) => ({
      chatId,
      name: this.contacts.get(chatId)?.name,
      lastMessageAt: messages.at(-1)?.timestamp,
      messageCount: messages.length,
    }));
  }

  getRecentMessages(chatId: string, limit: number): StoredMessage[] {
    const list = this.messagesByChat.get(chatId) ?? [];
    return list.slice(-limit);
  }

  searchContacts(query: string): StoredContact[] {
    const q = query.toLowerCase();
    return [...this.contacts.values()].filter(
      (c) => c.id.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q),
    );
  }
}
