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
  private readonly authFolder: string;
  private readonly logger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? "silent" });

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
        console.error(`WhatsApp connected as ${this.selfJid}`);
        if (this.selfJid) this.emit("ready", this.selfJid);
      }

      if (connection === "close") {
        this.selfJid = undefined;
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

    socket.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;

      for (const message of messages) {
        const chatId = message.key.remoteJid;
        const text = extractText(message);
        if (!chatId || !text) continue;

        const stored: StoredMessage = {
          chatId,
          fromMe: Boolean(message.key.fromMe),
          senderName: message.pushName ?? undefined,
          text,
          timestamp: extractTimestamp(message),
        };

        this.store.recordMessage(stored);
        this.emit("message", stored);
      }
    });
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp is not connected yet");
    }
    await this.socket.sendMessage(normalizeJid(to), { text });
  }
}
