import { EventEmitter } from "node:events";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  DisconnectReason,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { WhatsAppStore, type StoredMessage } from "./store.js";

/** Accepts a raw JID ("1555...@s.whatsapp.net") or a bare phone number and returns a JID. */
export function normalizeJid(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) {
    throw new Error(`"${input}" is not a valid phone number or WhatsApp JID`);
  }
  return `${digits}@s.whatsapp.net`;
}

function extractText(message: WAMessage): string | undefined {
  const content = message.message;
  if (!content) return undefined;
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    undefined
  );
}

function extractTimestamp(message: WAMessage): number {
  const raw = Number(message.messageTimestamp);
  return (Number.isFinite(raw) && raw > 0 ? raw : Date.now() / 1000) * 1000;
}

/**
 * Owns one Baileys ("linked device") session for a personal WhatsApp
 * account: QR pairing, session persistence, and buffering recent
 * chats/messages/contacts so the MCP tools below have something to read.
 */
export class WhatsAppConnection extends EventEmitter {
  readonly store = new WhatsAppStore();

  private socket?: WASocket;
  private selfJid?: string;
  /**
   * WhatsApp is rolling out privacy-preserving "LID" identities
   * (`@lid` JIDs) alongside the classic phone-number JID
   * (`@s.whatsapp.net`). On accounts where this has rolled out, your own
   * "Message yourself" chat's `remoteJid` is the `@lid` form even though
   * `socket.user.id` still reports the phone-number form — the two will
   * never string-match, so both are tracked here and `isSelfChat` checks
   * against either.
   */
  private selfLid?: string;
  private readonly authFolder: string;
  private readonly logger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? "silent" });

  /**
   * IDs of messages this connection sent via `sendMessage`. WhatsApp's
   * multi-device sync echoes every sent message back through
   * `messages.upsert` — including to a self-chat — with `fromMe: true`,
   * indistinguishable from a message the human actually typed unless we
   * track our own sends. Without this, any consumer that reacts to
   * `fromMe` self-chat messages (like whatsapp-agent's instruction
   * listener) will re-trigger on its own replies forever.
   */
  private readonly ownMessageIds = new Set<string>();

  constructor(authFolder: string) {
    super();
    this.authFolder = authFolder;
  }

  get isReady(): boolean {
    return Boolean(this.socket && this.selfJid);
  }

  get selfId(): string | undefined {
    return this.selfJid;
  }

  /** True when `chatId` is your own "Message yourself" chat, in either JID form. */
  isSelfChat(chatId: string): boolean {
    if (!this.selfJid && !this.selfLid) return false;
    const normalized = jidNormalizedUser(chatId);
    return normalized === this.selfJid || normalized === this.selfLid;
  }

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      auth: state,
      version,
      logger: this.logger,
      printQRInTerminal: false,
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      const { connection, qr, lastDisconnect } = update;

      if (qr) {
        console.error("\nScan this QR code in WhatsApp: Settings > Linked devices > Link a device\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        this.selfJid = socket.user ? jidNormalizedUser(socket.user.id) : undefined;
        this.selfLid = socket.user?.lid ? jidNormalizedUser(socket.user.lid) : undefined;
        console.error(`WhatsApp connected as ${this.selfJid}${this.selfLid ? ` (lid: ${this.selfLid})` : ""}`);
        if (this.selfJid) this.emit("ready", this.selfJid);
      }

      if (connection === "close") {
        this.selfJid = undefined;
        this.selfLid = undefined;
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
          ?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.error(`WhatsApp connection closed${loggedOut ? " (logged out — delete the auth folder to relink)" : ", reconnecting..."}`);
        if (loggedOut) {
          this.emit("logged-out");
        } else {
          void this.start();
        }
      }
    });

    socket.ev.on("contacts.upsert", (contacts) => {
      for (const contact of contacts) {
        this.store.recordContact(contact.id, contact.name ?? contact.notify);
      }
    });

    // Live messages: record AND emit, so whatsapp-agent's listener reacts to them.
    socket.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;
      for (const message of messages) {
        const stored = this.recordMessage(message);
        if (stored) this.emit("message", stored);
      }
    });

    // One-time backfill Baileys sends right after connecting: without this,
    // the store starts empty on every restart and list_chats/
    // get_recent_messages only ever see activity that happens to arrive
    // while the server is running. Recorded but never emitted — these are
    // old messages, not new instructions for whatsapp-agent to act on.
    socket.ev.on("messaging-history.set", ({ messages, contacts }) => {
      for (const contact of contacts) {
        this.store.recordContact(contact.id, contact.name ?? contact.notify);
      }
      for (const message of messages) {
        this.recordMessage(message);
      }
    });
  }

  /** Extracts, dedupes against our own sends, and stores one incoming message. Returns it if it was actually stored. */
  private recordMessage(message: WAMessage): StoredMessage | undefined {
    const chatId = message.key.remoteJid;
    const text = extractText(message);
    if (!chatId || !text) return undefined;

    if (message.key.id && this.ownMessageIds.has(message.key.id)) {
      this.ownMessageIds.delete(message.key.id);
      return undefined;
    }

    const stored: StoredMessage = {
      chatId,
      fromMe: Boolean(message.key.fromMe),
      isSelfChat: this.isSelfChat(chatId),
      senderName: message.pushName ?? undefined,
      text,
      timestamp: extractTimestamp(message),
    };

    this.store.recordMessage(stored);
    return stored;
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp is not connected yet");
    }
    const sent = await this.socket.sendMessage(normalizeJid(to), { text });
    const id = sent?.key?.id;
    if (id) {
      this.ownMessageIds.add(id);
      // The echo normally arrives within a second or two; this is just a
      // bound so an echo that never comes doesn't leak memory forever.
      setTimeout(() => this.ownMessageIds.delete(id), 60_000).unref();
    }
  }
}
