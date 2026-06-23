---
name: design-review
description: Review a UI change against a short, fixed checklist before it ships. Use when the user asks for a design review, asks "does this look right", or shares a screenshot/component and wants feedback on the visual result — not for building new UI from scratch.
---

You are reviewing a UI change against a fixed checklist. Produce a short report. Do not edit files unless the user asks you to fix something.

This file is an **example skill** — it shows the shape every `SKILL.md` follows: YAML frontmatter with a `name` and a precise `description` (the description is what the harness matches against to decide when to load the skill), then a focused body of instructions. Keep skills narrow: one job, one checklist, one stop condition.

## When this applies

- The user has a built component, page, or screenshot and wants feedback on the visual result.
- The user asks "does this look right / is this ready to ship."

It does **not** apply when the user wants you to design or build new UI — that is a different task. If there is no artifact to review yet, say so and stop.

## How to review

Look at the artifact (screenshot, rendered output, or the markup + styles). Walk the checklist once, top to bottom. For each item, record pass / fail / not-applicable and one short note.

1. **Hierarchy** — is the single most important element clearly the most prominent? If everything competes for attention, flag it.
2. **Spacing rhythm** — does spacing come from a consistent scale, or are there one-off pixel values? Flag arbitrary gaps.
3. **Type scale** — are there at most a few distinct sizes/weights, used consistently? Flag a fourth or fifth ad-hoc size.
4. **Color discipline** — background, foreground, and one accent, plus neutrals. Flag a second unplanned accent hue.
5. **Alignment** — do edges line up to a shared grid or baseline? Flag elements that float off-grid.
6. **State coverage** — for interactive elements, are hover / focus / disabled / empty / error states handled, or only the happy path? Flag missing focus-visible styling.
7. **Responsive behavior** — does the layout hold at a narrow width, or does it overflow / crush? Flag the first breakpoint that breaks.

Do not invent issues to fill the list. "Pass" on every item is a valid outcome.

## Output format

```
## Design review

**Artifact**: <what you reviewed>

**Findings**:
- [<pass | fix>] <checklist item> — <one-line note>
...

**Verdict**: <Ship it | Fix these first: N items>
```

List only items worth acting on under Findings; you do not need to print all seven if most passed cleanly.

## Stop condition

One pass over the checklist, one report. Do not redesign the artifact, do not propose a new direction, and do not edit files unless the user explicitly asks you to apply a fix.
