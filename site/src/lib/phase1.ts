// Phase 1 — single source of truth for the topic list.
// The hub renders from this, and each topic page reads it for prev/next nav.
// `built: false` topics render as disabled cards (no link), so the hub can ship
// before every page exists without producing a broken internal link.
// `path` is passed to href(); topic 1 (the agent loop) lives at the top level,
// the rest under /phase-1/.

export interface Topic {
  n: number;
  title: string;
  blurb: string;
  path: string; // argument for href()
  built: boolean;
}

export const TOPICS: Topic[] = [
  {
    n: 1,
    title: "The agent loop",
    blurb:
      "Read, plan, act, check, repeat. The loop everything else sits inside.",
    path: "agent-loop",
    built: true,
  },
  {
    n: 2,
    title: "Tool calls",
    blurb:
      "How the model acts: it asks for a tool, the harness runs it, the result comes back.",
    path: "phase-1/tool-calls",
    built: true,
  },
  {
    n: 3,
    title: "The plan system",
    blurb:
      "Plan mode and the to-do list: how Claude Code plans before it acts.",
    path: "phase-1/planning",
    built: true,
  },
  {
    n: 4,
    title: "Context and memory",
    blurb:
      "The context window, project instructions, and what compaction keeps.",
    path: "phase-1/context-and-memory",
    built: true,
  },
  {
    n: 5,
    title: "Hooks",
    blurb:
      "The six moments in a session where Claude Code can run your own code.",
    path: "phase-1/hooks",
    built: true,
  },
  {
    n: 6,
    title: "Commands and skills",
    blurb:
      "Reusable instructions you can name and call, so you don't retype them.",
    path: "phase-1/commands-and-skills",
    built: true,
  },
  {
    n: 7,
    title: "Subagents",
    blurb:
      "Separate agents for isolated or parallel work, each with its own context.",
    path: "phase-1/subagents",
    built: true,
  },
  {
    n: 8,
    title: "MCP servers",
    blurb: "Connecting Claude Code to outside tools and data.",
    path: "phase-1/mcp",
    built: true,
  },
  {
    n: 9,
    title: "The stock demo",
    blurb:
      "Watch stock Claude Code build a small game, end to end, with every part working together.",
    path: "phase-1/stock-demo",
    built: true,
  },
];

// prev/next helpers for in-page nav. Returns only built neighbors.
export function neighbors(path: string): { prev?: Topic; next?: Topic } {
  const i = TOPICS.findIndex((t) => t.path === path);
  if (i === -1) return {};
  const prev = i > 0 ? TOPICS[i - 1] : undefined;
  const next = i < TOPICS.length - 1 ? TOPICS[i + 1] : undefined;
  return {
    prev: prev?.built ? prev : undefined,
    next: next?.built ? next : undefined,
  };
}
