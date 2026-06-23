# Security Policy

This is a teaching repository, but it ships runnable code (hooks, an MCP server,
an installer) and it talks to an LLM provider with your API key. A few things
matter.

## How keys are handled

- The harness reads its LLM key from the **environment only**
  (`LLM_API_KEY`, or `OPENAI_API_KEY` as a fallback). No key is ever read from a
  file committed to this repo, and nothing here writes a key to disk.
- `.gitignore` excludes `.env`, `*.key`, `.credentials.json`, and the harness's
  runtime data directories (memories, logs, evolution). Runtime data can contain
  paths and snippets from whatever project you run the harness in — keep it out
  of commits.
- CI runs two independent checks on every push: `scripts/check-depersonalized.sh`
  (secrets repo-wide + personal tokens in `reference/`) and `gitleaks`.

## If you fork this to build your own harness

The capstone (Part 8) walks through this, but the short version:

1. **Rotate any key** that ever touched a config file before you make a repo
   public. A key in git history is compromised even after you delete the file —
   rotate it, don't just remove it.
2. Run `scripts/check-depersonalized.sh` (or your own copy) before the first push.
3. Never paste a key — even a "test" one — into an issue, PR, or commit.

## Reporting a vulnerability

If you find a security issue in the reference harness, the MCP server, or the
install/tooling scripts:

- For anything sensitive, use GitHub's **private vulnerability reporting**
  ("Security" tab → "Report a vulnerability") so it isn't disclosed publicly
  before it can be fixed.
- For low-risk issues, open a normal issue using the **bug report** template —
  but redact any keys or private paths first.

There is no bug bounty; this is a community learning project. Fixes land as
regular PRs once triaged.
