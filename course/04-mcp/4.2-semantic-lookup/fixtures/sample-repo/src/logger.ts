/**
 * logger.ts — a one-function logging helper. Prefixes each line with a level.
 * This is the file we'll ask impact_check about: "who imports the logger?"
 */

export function log(level: string, message: string): void {
  process.stdout.write(`[${level.toUpperCase()}] ${message}\n`);
}

export const LEVELS = ["debug", "info", "warn", "error"];
