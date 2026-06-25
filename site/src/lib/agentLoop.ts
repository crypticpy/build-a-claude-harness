// The Agent Loop — shared model for the scrollytelling explorable.
// One source of truth: the page renders the narrative + legend from this,
// and the canvas controller reads the same node list. Plain, 8th-grade prose,
// no jargon that isn't defined on the spot.

export type Accent = "ink" | "context" | "action" | "verified" | "risk";

export interface LoopNode {
  id: string;
  label: string; // short label drawn on the node
  accent: Accent; // semantic color
  blurb: string; // one plain line, used in the legend / data fallback
}

// The six stages of the loop, left to right, with a return arc from the last
// back to "plan". These are the moving parts the harness wraps around a model.
export const NODES: LoopNode[] = [
  { id: "goal", label: "Goal", accent: "ink", blurb: "What you asked for." },
  {
    id: "context",
    label: "Gather context",
    accent: "context",
    blurb: "Reads memory and the files that matter before doing anything.",
  },
  {
    id: "plan",
    label: "Plan",
    accent: "ink",
    blurb: "Breaks the goal into small steps.",
  },
  {
    id: "act",
    label: "Use a tool",
    accent: "action",
    blurb:
      "Edits a file or runs a command. The only step that changes anything.",
  },
  {
    id: "verify",
    label: "Verify",
    accent: "verified",
    blurb: "Runs the tests to check its own work.",
  },
  {
    id: "evaluate",
    label: "Evaluate",
    accent: "ink",
    blurb: "Passed? Finish. Failed? Loop back to plan.",
  },
];

export interface Scene {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
}

// The narrative spine: curiosity, then one stage per beat, then the surprise
// (it fails and loops instead of shipping the bug), then the payoff.
export const SCENES: Scene[] = [
  {
    id: "intro",
    eyebrow: "The agent loop",
    title: "On its own, a model just predicts text.",
    body: "An AI model writes words. By itself it cannot open your files, run your tests, or check whether it was right. The harness is everything wrapped around the model that can. Scroll, and watch one plain request turn into finished, checked work.",
  },
  {
    id: "goal",
    eyebrow: "Step 1",
    title: "It starts with a goal.",
    body: "You ask for something real: “Add a CSV export button to the dashboard.” That one sentence is all the model gets to begin with.",
  },
  {
    id: "context",
    eyebrow: "Step 2",
    title: "First it reads, before it writes.",
    body: "A good harness gathers context first. It pulls up notes saved from earlier and opens the files that matter, so the model works from what is really in your project instead of guessing.",
  },
  {
    id: "plan",
    eyebrow: "Step 3",
    title: "Then it makes a plan.",
    body: "It breaks the goal into small steps: find the dashboard, add a button, wire it to an export function, write a test for it.",
  },
  {
    id: "act",
    eyebrow: "Step 4",
    title: "It uses a tool.",
    body: "Now it acts. It edits a file or runs a command. This is the only step where anything actually changes on your computer, so it is also the one worth watching.",
  },
  {
    id: "verify",
    eyebrow: "Step 5",
    title: "It checks its own work.",
    body: "Instead of trusting the edit, the harness runs the tests. This single habit is most of what separates reliable work from a hopeful guess.",
  },
  {
    id: "fail",
    eyebrow: "Step 6",
    title: "The first try fails. Good.",
    body: "A test goes red. Here is the part that matters: the loop does not ship the broken code. It carries the failure back to the planning step and tries again.",
  },
  {
    id: "repass",
    eyebrow: "Step 7",
    title: "Around again, and it passes.",
    body: "Using what the failed test showed, it adjusts the plan, edits again, and re-runs the tests. This time they pass. Only now is the work actually done.",
  },
  {
    id: "play",
    eyebrow: "The whole point",
    title: "So what is the harness worth?",
    body: "The model is identical in both runs below. Only the harness around it changes. Press a button and watch the same request either finish clean or ship a bug.",
  },
];

// Color semantics, stated once and reused everywhere (canvas + legend).
export const LEGEND: { accent: Accent; label: string }[] = [
  { accent: "context", label: "Context" },
  { accent: "action", label: "Action" },
  { accent: "verified", label: "Verified" },
  { accent: "risk", label: "Risk" },
];
