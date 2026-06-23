// api-key.mjs — resolve the LLM key for the harness's hooks.
// This is the depersonalized twin of the dirty/ fixture: no hardcoded key, a
// provider-neutral env var, and a path resolved from the home dir at runtime.

import { homedir } from "node:os";
import { join } from "node:path";

export function resolveKey() {
  // ✓ Key comes from the environment only — never hardcoded, never tracked.
  const key = process.env.LLM_API_KEY || null;

  // ✓ Path is built from homedir() at runtime — no absolute path in source.
  const configPath = join(homedir(), ".claude", "llm-config.json");

  return { key, configPath };
}
