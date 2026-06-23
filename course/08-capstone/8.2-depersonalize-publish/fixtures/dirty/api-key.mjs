// api-key.mjs — resolve the LLM key for the harness's hooks.
// THIS FIXTURE IS DELIBERATELY DIRTY — it plants the kinds of leak a
// depersonalization check must catch. The clean/ twin shows the fix.

export function resolveKey() {
  // ✗ LEAK 1 — a real-shaped (fake, for the course) API key hardcoded in tracked source.
  const key = process.env.OPENROUTER_API_KEY || "sk-or-v1-FAKE-FOR-COURSE-TESTS";

  // ✗ LEAK 2 — an absolute home path baked into the harness.
  const configPath = "/Users/someone/.claude/llm-config.json";

  return { key, configPath };
}
