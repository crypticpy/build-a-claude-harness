// How This Harness Works — shared model for the second explorable.
// Same scrollytelling shape as the agent loop, but the subject is the real
// harness: six lifecycle moments, one router every wired moment passes through,
// a two-helper fan-out, and a memory loop. The event/module facts mirror the
// generated models.json (the pinned settings file); the page shows the SHA so
// the picture stays honest.

export interface HEvent {
  id: string; // the real lifecycle event name
  plain: string; // plain caption drawn under the node
  wired: boolean; // does this harness attach anything here?
  modules: string[]; // plain descriptions of what runs, in run order
}

export const EVENTS: HEvent[] = [
  {
    id: "SessionStart",
    plain: "It starts up",
    wired: true,
    modules: ["Loads a snapshot of your project"],
  },
  {
    id: "UserPromptSubmit",
    plain: "You send a message",
    wired: true,
    modules: ["Hands back the notes it saved before"],
  },
  { id: "PreToolUse", plain: "About to use a tool", wired: false, modules: [] },
  {
    id: "PostToolUse",
    plain: "A tool just finished",
    wired: true,
    modules: ["Tidies up the file that changed", "Writes a line to the log"],
  },
  {
    id: "PreCompact",
    plain: "About to trim the chat",
    wired: true,
    modules: ["Saves the important parts as memory"],
  },
  {
    id: "Stop",
    plain: "The turn ends",
    wired: true,
    modules: ["Runs one last safety check"],
  },
];

export interface Scene {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

export const SCENES: Scene[] = [
  {
    id: "intro",
    eyebrow: "The real machine",
    title: "Now, the harness that actually runs it.",
    body: "That loop was the idea. This is the real thing: the setup running the author’s own Claude Code. Same shape, but now every part is a real piece you could open in a settings file. Scroll to watch one session pass through it.",
  },
  {
    id: "start",
    eyebrow: "Moment 1",
    title: "It loads your project first.",
    body: "The instant a session starts, the harness runs one helper that loads a short snapshot of your project, so the AI begins already knowing where it is.",
  },
  {
    id: "prompt",
    eyebrow: "Moment 2",
    title: "It hands back what it remembered.",
    body: "Every time you send a message, another helper slips in the notes the harness saved during earlier sessions. Hold onto this one — it matters in a minute.",
  },
  {
    id: "pre",
    eyebrow: "Moment 3",
    title: "One moment is left empty.",
    body: "Right before the AI uses a tool, this harness does nothing at all. It is a real moment, but no helper is attached, so it stays a dashed outline.",
  },
  {
    id: "post",
    eyebrow: "Moment 4",
    title: "The busy moment runs two helpers.",
    body: "Right after a tool finishes, two helpers fire in order. First one tidies up the file that changed. Then a second writes a line to the log, recording what happened.",
  },
  {
    id: "router",
    eyebrow: "The trick",
    title: "Every arrow goes through one box.",
    body: "The helpers never attach to the moments directly. Every wired moment routes through a single program — the router. One entry point decides what runs. That one idea is most of how this harness is built.",
  },
  {
    id: "compact",
    eyebrow: "Moment 5",
    title: "When the chat gets long, it saves.",
    body: "A session can only hold so much. Before the oldest part gets trimmed away, a helper distills what mattered and writes it into a memory store, so it is not lost.",
  },
  {
    id: "memory",
    eyebrow: "The loop closes",
    title: "And that memory comes back.",
    body: "Here is the payoff. The notes saved here are exactly what got handed back at Moment 2, at the start of your next message. The harness remembers across the gap. That is the loop.",
  },
  {
    id: "play",
    eyebrow: "Plain vs wired",
    title: "So what does the harness add?",
    body: "Out of the box, all six moments are empty and the model works alone. Wired up, the same session gains memory, tidy files, a log, and a safety net. Press to see the difference.",
  },
];
