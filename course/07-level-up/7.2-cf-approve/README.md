# 7.2 — cf-approve: auto-approve the safe prompts (and pay attention to the bill)

Claude Code asks permission before a lot of operations. Most of those asks are for things that are obviously fine — `git status`, `npm install`, reading a file. Each one is a small tax on your throughput: you context-switch, you click "allow," you lose your train of thought. **cf-approve** clears the provably-safe ones automatically and surfaces only the genuinely risky ones — but it makes a paid LLM call to decide, so this is the one Part-7 module where _cost_ is part of the design, not a footnote.

> 💸 **Requirement (read before you start):** cf-approve needs an **LLM API key**, and it **bills per permission decision** it hasn't cached. Decisions are cents-scale individually, but they accumulate across a busy week. A 7-day cache (taught below) is what keeps this from running up a surprise bill. If you don't want a metered tool in your permission path, read the lesson for the _safety model_ — default-allow / narrow-explicit-deny is worth knowing even if you never wire the tool.

## Objectives

By the end, you will be able to:

- **Explain** the default-allow / narrow-explicit-deny safety model and why it points that direction.
- **Account for** cost: explain how the 7-day cache bounds per-decision LLM spend.
- **Prove**, against a shipped fixture, that a safe request auto-approves and a named-harm request is denied — using a local policy evaluator that mirrors cf-approve's decision shape.

Each objective maps to the Checkpoint below.

## Time

25–35 minutes.

## Before you start

> 🧠 **No peeking (recall from Part 3):** In 3.4a you built a `Stop`-time quality gate that ran a type-check _only when files changed_ and _never threw_. What single discipline did that gate share with every hook since Part 1 — and why does a permission hook need it even more?
>
> <details><summary>Answer</summary><b>Fail-silent</b> (Principle 3): exit cleanly even on failure, never crash the session. A permission hook needs it most of all — if your auto-approver throws or hangs, it sits <i>directly in the path of every tool call</i>, so a crash there doesn't just lose a feature, it can wedge the whole session. An approval gate that errors must <b>fall back to asking the human</b>, never to allowing blindly and never to dying.</details>

Copy this lesson's `start/` — it contains a tiny policy evaluator with one blank to fill:

```bash
cp -r start my-approver && cd my-approver && cp -r ../fixtures .
```

## The lesson

### Principle: friction reduction — make the safe path frictionless, the risky path visible

[Friction reduction](../../../docs/principles.md#6-friction-reduction) says: every confirmation prompt is a small tax, so auto-approve what's _provably_ safe and surface only what genuinely needs a human. cf-approve is that principle wired into the **permission** event. When Claude Code is about to do something that needs your okay, cf-approve intercepts the request, asks an LLM "is this safe?", and either auto-approves it (you never see the prompt) or lets it through to you (when it's risky or uncertain).

The art is entirely in **which direction the policy leans.**

### The safety model: default-allow, narrow-explicit-deny

This is the heart of the lesson, and it's counterintuitive until you see why.

You might reach for **deny-by-default**: block everything, maintain an allow-list of safe things. That's the instinct from firewalls and security policy. **It's the wrong instinct here**, because it defeats the entire purpose. If the approver denies (i.e., falls back to asking you) for anything not on a hand-maintained allow-list, you'll get prompted constantly — and you've added an LLM bill on top of the prompts you were trying to eliminate. Friction reduction that increases friction is just cost.

So cf-approve goes the **other** way: **default-allow, with a narrow, explicit, named-harm deny set.** The LLM is told, in effect:

> Approve this request **unless** it matches one of a small list of concrete harms. Specifically deny:
>
> - **Credential exfiltration** — reading a secret _and_ sending it off the machine.
> - **Destructive operations outside the working directory** — `rm -rf` aimed at `/` or a home dir, not the project.
> - **Force-push to a protected branch** — `main`/`master` and friends.
> - **Privilege escalation** — sudo into something it has no business touching.
> - **Opening a public network listener** — exposing a port to the world.
>
> Everything else — `git reset --hard`, a destructive command scoped to _this_ project, installing a package, running an inline script — **allow.**

Read that list again and notice the shape: the deny set is **small, specific, and about concrete irreversible harm**, not about "things that feel scary." `git reset --hard` is destructive but local and recoverable-ish — allow. Piping a read secret to `curl` is exfiltration — deny. The policy isn't "be cautious"; it's "be permissive _except_ for a handful of named, genuinely-bad outcomes." That's what keeps the friction-reduction real: the common path is frictionless, and only the small risky set stays visible.

> ⚖️ **Why default-allow is defensible here:** cf-approve isn't your only line of defense — Claude Code's own permission system, your git history, and your own attention all still exist. cf-approve's job is to clear the _obvious_ yeses, not to be a security boundary. Treating it as a friction tool (its actual job) rather than a security control (not its job) is what makes default-allow the right call.

### Cost: the 7-day cache is load-bearing

Every **uncached** decision is a paid LLM call. The thing that makes this affordable is a **7-day decision cache** (168 hours): once cf-approve has judged a given request shape, it remembers the verdict for a week and doesn't pay to re-decide. In a normal workweek you do the same kinds of operations over and over, so after a day or two most decisions are cache hits — near-zero marginal cost.

Two cost levers follow directly:

- **Pick a cheap model.** This runs in the hot path of your permission prompts. Like the per-compaction summarizer back in Part 2, _frequency demands a cheap model_ — this is not the place to spend on a flagship. (Same cost-ladder reasoning: spend where it's rare and matters; economize where it's constant.)
- **Respect the cache.** If you disable the cache or set the TTL tiny, you pay full freight on every decision. The default 7-day window exists for a reason.

### How the reference does it

The harness wires cf-approve on the **permission-request event** (the `*` matcher — every tool's permission decision routes through it), ahead of any other observers. It reads the request JSON on stdin and returns a decision object — `{"decision":"allow"|"deny","reason":"..."}` — where `deny` doesn't mean "block forever," it means "don't auto-approve, hand this to the human." The LLM provider, model, system prompt (the deny list above), and cache TTL all live in cf-approve's own config file, outside the repo, so no key or policy leaks into version control.

> 🔑 **One key, shared.** In the reference, cf-approve's configured key is also the **first source** the harness's own LLM hooks (session memory, trace diagnosis) look for. So adopting cf-approve can double as providing the key the Part-2 memory layer needed. Worth knowing, but not required for this lesson's checkpoint — the checkpoint makes no live API call.

### Build — a local policy evaluator (no API call, no cost)

You won't make a real billed call to verify your understanding — that would be a strange thing to ask of a checkpoint. Instead, `start/` ships `evaluate-policy.mjs`: a tiny, **local** evaluator that encodes the _same_ default-allow / narrow-deny shape cf-approve uses, so you can prove you understand the decision boundary against fixtures, for free.

Open `start/evaluate-policy.mjs`. The deny-rule table is written for you. The **one blank** is the final decision step in `evaluate()`: a request is **denied** only if it matches one of the named-harm rules; **otherwise it's allowed** (that's the default-allow direction — don't invert it). Fill that in. The fixtures in `fixtures/` are real-shaped permission requests: some safe (`git status`, `npm install`, a project-local `rm`), some named harms (a secret piped off-machine, `rm -rf /`, a force-push to `main`).

## Checkpoint

Run the evaluator against the shipped fixtures and confirm both directions of the boundary.

**1 — A safe request auto-approves.**

```bash
node evaluate-policy.mjs fixtures/safe-git-status.json
```

✅ Prints `ALLOW` and exits 0 — a benign request clears with no human prompt. Try the other safe fixtures too (`fixtures/safe-npm-install.json`, `fixtures/safe-local-rm.json`); all `ALLOW`.

**2 — A named-harm request is denied.**

```bash
node evaluate-policy.mjs fixtures/harm-exfiltrate-secret.json
```

✅ Prints `DENY` with the rule that matched (e.g. `DENY (credential-exfiltration): reads a secret and sends it off-machine`) and exits 1. The other harm fixtures (`fixtures/harm-rm-rf-root.json`, `fixtures/harm-force-push-main.json`) also `DENY`, each naming its rule.

> The two directions together are the lesson: **default-allow** means the safe fixtures don't need to be on any list to pass, and **narrow-explicit-deny** means only the concretely-harmful ones are stopped — and each denial _names the specific harm_, which is exactly the transparency a real auto-approver owes you.

Run the bundled self-check to confirm all fixtures land on the right side at once:

```bash
node evaluate-policy.mjs --check fixtures
```

✅ Prints `POLICY OK — N allowed, M denied, 0 misclassified` and exits 0.

## Recap + next

You learned the safety model that makes auto-approval sane: **default-allow with a narrow, named, explicit-deny set**, leaning permissive because the goal is friction reduction, not a security boundary. You learned why the 7-day cache and a cheap model are what keep a per-decision LLM cost affordable. And you proved both directions of the decision boundary against fixtures — locally, for free — with the same shape cf-approve uses live.

→ **[7.3 — Chorus / Polyphony](../7.3-chorus-polyphony/)** moves from _removing_ a human checkpoint to _adding_ a non-human one: a second vendor's model reviewing your change before you ship. (Or jump to any other Part-7 module.)
