---
name: scope
description: Restate a task as a one-paragraph scope note before coding — what's in, what's out, what you won't touch.
argument-hint: <task description>
---

You are writing a short scope note before implementation for: $ARGUMENTS

Do not write any code yet. Produce exactly the structure below and then stop.

## Step 1: Restate the task

State the task in one sentence, in your own words. If $ARGUMENTS is ambiguous, name the ambiguity instead of guessing.

## Step 2: Draw the boundary

- **In scope**: the specific files or behaviors this task changes.
- **Out of scope**: things that look related but are explicitly _not_ this task. Name at least one.

## Step 3: Name the verification

State the one observable check that will prove the task is done (a test that passes, a command whose output changes, a file that gets written).

## Rules

- One scope note, then stop. Do not begin implementation.
- Do not propose extensibility, future-proofing, or refactors the task did not ask for.
- If the task fits in a single obvious edit, say so and recommend skipping the ceremony.
