# Contributing

Thanks for helping make this a better way to learn. This is a teaching repo, so the bar is **clarity and correctness** over cleverness.

## Ways to help

- **Report a broken lesson** — a `solution/` that doesn't run, a checkpoint that can't pass, a step that's wrong. Open an issue with the part number and your OS/Node version.
- **Fix a confusing explanation** — if a beginner would get lost, that's a real bug. PRs that add a glossary link or a plain-language sentence are very welcome.
- **Improve a `start/` skeleton** — better `TODO`s, clearer scaffolding.
- **Suggest a level-up module** — open an issue to discuss before building.

## Ground rules

1. **Every `solution/` must actually run.** CI verifies them. If you add or change a lesson, make sure its solution passes.
2. **Match the lesson template.** Each lesson README has: Objectives · Time · Before you start · the lesson · Checkpoint · Recap + next. Keep that shape.
3. **No personal or secret data.** Run `./scripts/check-depersonalized.sh` before pushing. Never commit an API key — keys live in environment variables only.
4. **Plain language wins.** Define jargon on first use or link the [glossary](docs/glossary.md). Assume a motivated non-expert reader.
5. **Conventional commits** — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Local checks before you open a PR

```bash
bash scripts/check-depersonalized.sh        # no personal/secret tokens
# if you touched the reference MCP server:
( cd reference/plugins/context-layer && npm install && npm run build )
```

## Scope

The **core** (Parts 0–6) stays runnable on one LLM key with no paid extras or hardware — keep it that way. Anything requiring extra CLIs, paid keys, or devices belongs in **Part 7 (level-up)**, clearly labeled with its requirements.

By contributing you agree your work is licensed under the repo's [MIT License](LICENSE).
