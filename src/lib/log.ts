import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const ERROR_LOG_FILE = path.join(LOG_DIR, "error.log");

/**
 * Appends one error to logs/error.log as a JSON line, in addition to the
 * usual console.error. On cPanel, stdout isn't reliably reachable without
 * shell access, so this gives a plain file the operator can open from the
 * File Manager to see what actually failed.
 */
export async function logError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(message, error);

  const entry = { time: new Date().toISOString(), message, stack, ...context };
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(ERROR_LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {
    // Filesystem write failed — the console.error above is the fallback record.
  }
}
