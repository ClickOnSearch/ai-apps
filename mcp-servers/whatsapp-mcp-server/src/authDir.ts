import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LEGACY_DIR = "./whatsapp-auth";

export interface AuthDir {
  dir: string;
  /** Set when an older session in the current folder is still being used. */
  note?: string;
}

/**
 * Where the linked-device session (WhatsApp login keys) lives. Defaults to a
 * fixed folder in your home directory so it doesn't depend on which folder
 * you happened to run the command from (which would ask for a new QR code
 * each time) and doesn't leave login credentials inside project folders.
 *
 * Older versions stored it in `./whatsapp-auth`; if that exists we keep using
 * it so nobody has to re-link.
 */
export function resolveAuthDir(env: NodeJS.ProcessEnv = process.env): AuthDir {
  const configured = env.WHATSAPP_AUTH_DIR;
  if (configured) return { dir: ensure(configured) };

  if (existsSync(LEGACY_DIR)) {
    return {
      dir: LEGACY_DIR,
      note: `Using the existing session in ${LEGACY_DIR}. New links are stored in ${defaultDir()}.`,
    };
  }
  return { dir: ensure(defaultDir()) };
}

function defaultDir(): string {
  return join(homedir(), ".clickonsearch", "whatsapp-auth");
}

function ensure(dir: string): string {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
