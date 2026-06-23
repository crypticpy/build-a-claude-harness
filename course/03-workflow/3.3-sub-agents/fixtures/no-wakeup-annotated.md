# Annotated: the no-wakeup gotcha (read this — do NOT run it)

This is teaching material, not an exercise. There is nothing to launch and no checkpoint here. Read the annotation and move on.

A sub-agent runs in its **own context** and returns **exactly once** — when it's done, with its final message. It cannot tap the main session on the shoulder partway through. The deprecated `pr-babysitter` agent is the cautionary tale: it was written as if it could watch a pull request for ten minutes and _wake the main conversation up_ when a bot posted a review comment. It can't. Here's the shape of the mistake, annotated.

```text
---
name: pr-babysitter            # a sub-agent: own context, returns ONCE
description: Watch a PR and ping the main session when CodeRabbit comments.
---

You are babysitting PR #$ARGUMENTS until the bots are done.

1. Poll the PR every 30s for new review comments.        # ❌ MISTAKE 1:
                                                          #    a sub-agent has no timer and no
                                                          #    way to "keep running in the
                                                          #    background." It runs its turns and
                                                          #    then it's finished.

2. When a new comment appears, NOTIFY the main session    # ❌ MISTAKE 2 (the no-wakeup gotcha):
   so it can address the comment immediately.             #    there is no channel from a sub-agent
                                                          #    back INTO the parent mid-run. The
                                                          #    parent gets ONE thing: this agent's
                                                          #    final message, after it returns.
                                                          #    A sub-agent cannot wake anyone up.

3. Keep watching until CI is green, then merge.           # ❌ MISTAKE 3: "keep watching" implies a
                                                          #    long-lived loop the agent can't sustain;
                                                          #    and merging is an action with real
                                                          #    consequence buried inside a fire-and-
                                                          #    forget job.
```

## Why it can't work

The parent ↔ sub-agent relationship is **one call, one return**. The parent spawns the agent, the agent does bounded work in its clean context, the agent returns a final message, the parent reads it. There is no event, callback, or interrupt that flows the other direction _while the agent is running_. "Notify the main session" and "ping me when X happens" are not things a sub-agent can do.

## What to do instead

The watch-and-react pattern belongs to a **different mechanism** — a polling loop driven by the harness or a bash script that the _main session_ owns, writing state to a file the session reads on its next turn (the same write-to-disk / read-on-prompt idea as the Memento pattern in Part 2). The reference harness does exactly this: babysitting is a bash-poll loop plus an events queue on disk, **not** a sub-agent that wakes you up. The replacement keeps the agent doing what agents do — one bounded job, one report — and moves the "stay alive and notify" part to a loop that has a place to put its output.

**The rule to carry forward:** give a sub-agent _one bounded objective and the exact report shape you want back_. If your design needs the agent to "keep going" or "tell me when," that's a loop/hook job, not an agent job.
