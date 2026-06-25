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
    title: "Now, the machine that runs it.",
    body: "That loop was the idea. This is the real setup behind one working copy of Claude Code, and everything you're about to see is something you could open in a settings file and read for yourself. Scroll, and follow a single session all the way through.",
  },
  {
    id: "start",
    eyebrow: "Moment 1",
    title: "It walks in already oriented.",
    body: "The moment a session begins, before you've typed a word, the harness slips the AI a short briefing about your project. What it is, where things live, what you were doing last time. So it starts out knowing where it is instead of staring at a blank wall.",
  },
  {
    id: "prompt",
    eyebrow: "Moment 2",
    title: "Every message arrives with notes.",
    body: "When you send a message, your words don't travel alone. The harness tucks in a set of notes it saved during earlier sessions and hands them over together. Keep an eye on this one, because it comes back around in a minute.",
  },
  {
    id: "pre",
    eyebrow: "Moment 3",
    title: "One moment, left open on purpose.",
    body: "There's a beat right before the AI reaches for a tool where the harness could step in and inspect the request first. This one chooses not to. The moment is real and every session passes through it, but nothing's attached, so it just sits there as an empty outline.",
  },
  {
    id: "post",
    eyebrow: "Moment 4",
    title: "The busiest moment runs two.",
    body: "Right after a tool finishes is where the most happens, and the order is deliberate. First, one helper cleans up whatever file just changed and smooths out its formatting. Then a second writes a single line to a running log, so there's always a record of what ran and when.",
  },
  {
    id: "router",
    eyebrow: "The trick",
    title: "Everything goes through one door.",
    body: "Here's the move that holds the whole thing together. The helpers never hang off the moments directly. Every wired moment feeds into one small program first, the router, and the router decides what actually runs. One way in, one place making the calls. Almost everything else is built on top of that single idea.",
  },
  {
    id: "compact",
    eyebrow: "Moment 5",
    title: "Before it forgets, it saves.",
    body: "A conversation can only get so long before the oldest parts have to be trimmed to make room, and most setups just let that history fall off the edge. This one reads back over what happened first, pulls out the parts that actually mattered, and writes them into a memory store for safekeeping.",
  },
  {
    id: "memory",
    eyebrow: "The loop closes",
    title: "And then it comes back to you.",
    body: "Here's the payoff. Those saved notes are the very ones the harness handed over back at Moment 2, the next time you started typing. What it learned in one session quietly carries into the next, so the AI picks up where it left off instead of meeting you cold every morning.",
  },
  {
    id: "play",
    eyebrow: "Plain vs wired",
    title: "So what's the model, and what's the harness?",
    body: "Out of the box, every one of these moments is empty and the model works alone. Wire them up and the same session suddenly has a memory, clean files, a running log, and a safety check on the way out. Same model, both times. Flip between them and watch the difference.",
  },
];
