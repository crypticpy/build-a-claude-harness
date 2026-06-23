# Where to Spend Tokens

> The harness runs a small AI in the background. This page is the honest answer to "what does that cost, and how is it kept cheap?" It's [Principle 4: token economy](principles.md#4-token-economy) made concrete.

## The one rule: match the budget to the frequency

Not every background job deserves the same spend. The harness sorts its LLM work into two **roles**, and the rule that separates them is simple:

> **A job that runs constantly should be cheap. A job that runs rarely can afford to be rich.**

You spend a little, often — or a lot, seldom. Never a lot, often.

| Role        | Runs…                                                                                                              | Frequency | Budget                     | Effort   |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | --------- | -------------------------- | -------- |
| `summarize` | on **every** [compaction](glossary.md#compaction-context-compaction) — the [Memento write](the-memento-pattern.md) | high      | small (`maxTokens: 8000`)  | `low`    |
| `recall`    | on demand: [`/evolve`, `/retrospective`](commands-skills-agents.md)                                                | rare      | large (`maxTokens: 25000`) | `medium` |

That table is not prose — it's the actual config. Here it is verbatim from [`config.json`](../reference/hooks/unified/config.json):

```jsonc
"llm": {
  "summarize": { "maxTokens": 8000,  "reasoningEffort": "low",
    "description": "Per-compaction session summary. Runs on EVERY compaction → cheap." },
  "recall":    { "maxTokens": 25000, "reasoningEffort": "medium",
    "description": "On-demand deep analysis (/evolve, /retrospective). Runs RARELY but matters more." }
}
```

Notice what's _not_ in there: no model name, no provider, no API key. Those come from the environment ([`LLM_MODEL`, `LLM_BASE_URL`](glossary.md#endpoint)). The config only sets **budget and effort per role** — so the same file works against any provider, and the same _model_ is used for both roles. The lever isn't which model; it's how much you let it spend.

## The two levers

- **`maxTokens` is the primary lever, and it's always on.** It's the cap on how much the model can write back. A summary that's allowed 8,000 tokens costs a fraction of one allowed 25,000 — on every single call. This is the knob that travels across _every_ provider, so the harness leans on it.
- **`reasoningEffort` is the secondary lever, and it's conditional.** On newer "reasoning" models served over the [Responses API](glossary.md#openai-responses-api-vs-chat-completions-api), you can ask the model to think harder (`low` → `medium` → `high`) before answering. Each step up lets the model spend more _hidden_ reasoning tokens — and those are billed as output, so on a reasoning model effort can move the bill as much as `maxTokens` does. We call it "secondary" because it's conditional, not because it's cheap: it only applies if you've opted in (`LLM_REASONING`) _and_ your model supports it. On a plain non-reasoning model it's silently omitted, because sending it would error. So budget is the dependable lever; effort is a powerful-but-situational one. (See [`llm-call.mjs`](../reference/hooks/unified/modules/llm-call.mjs), which is the one place the harness talks to a model.)

## "Free memory" costs literally nothing

The cheapest token is one that never reaches a model at all ([Principle 4](principles.md#4-token-economy)). The harness's [rolling log](glossary.md#rolling-log) — the append-only record of every tool operation — is written **with no LLM call**. It's plain file I/O. A complete, searchable audit trail of "what happened this session" that costs $0.00 and never touches your API budget. Reach for an LLM only when you need _judgment_; for a record, a log is free.

## A cents-per-day mental model

Let's be honest rather than hand-wavy. Costs depend on your provider and model, so here's how to _reason_ about it, with one worked example.

The only call that runs automatically and repeatedly is `summarize`, on each compaction. A heavy day of continuous work might trigger compaction **10–20 times**. Each call reads a condensed transcript (capped, a few thousand input tokens) and writes at most 8,000 tokens back.

Plug in a small, cheap background model. Suppose it's priced around **$0.15 per million input tokens and $0.60 per million output tokens** (typical for a budget "mini"-class model):

- Per `summarize` call: roughly **~10k input + up to 8k output** ≈ `(10,000 × $0.15 + 8,000 × $0.60) / 1,000,000` ≈ **$0.0063** — under a cent.
- A heavy day at 20 compactions: `20 × $0.0063` ≈ **$0.13/day**.
- A normal day (a handful of compactions): **a couple of cents.**

So the automatic background cost is **cents per day** — single-digit dollars only on an exceptional day. The `recall` role is bigger per call, but you trigger it by hand (you typed `/evolve`), and only now and then, so it doesn't change the daily picture.

> ⚠️ This is a _mental model_, not a quote. The numbers move with your provider's prices and your model choice — and if you point the harness at a frontier-tier model for the background `summarize` role (don't), the same 20 calls could cost dollars instead of cents. The whole point of the role split is to put the cheap model on the frequent job. Pick a small model for `summarize` and the math above holds.

## Where this shows up

- **Course [Part 2: Memory](../course/02-memory/)** — you wire up the rolling log (free) and the `summarize` call (cheap) and feel the difference directly.
- **Reference:** the role budgets in [`config.json`](../reference/hooks/unified/config.json) and the two levers in [`modules/llm-call.mjs`](../reference/hooks/unified/modules/llm-call.mjs).
- **The job that spends the `summarize` budget:** [the Memento pattern](the-memento-pattern.md).
- **The jobs that spend the `recall` budget:** [commands, skills & agents](commands-skills-agents.md).

---

_[docs index](README.md) · [glossary](glossary.md) · [principles](principles.md)_
