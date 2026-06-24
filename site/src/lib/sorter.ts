// The ScenarioSorter item bank: sort requests by how the course-taught approval
// gate treats them (SV-4). Allow is friction-free and inside the lines; Deny is
// where the gate arrests. Every item carries the discriminating feature that
// decides its bin — the one sentence that makes the answer teachable rather than
// memorized. A missing feature is a build failure (see the assertion below), so
// the bank can never ship an item the learner cannot reason about.
//
// Honesty, carried from SV-4: this is the gate's *intuition*, a friction tool,
// not a security boundary. The bins teach the shape of the judgement, not a
// guarantee.

export type BinId = "allow" | "deny";

export interface SortItem {
  id: string;
  label: string; // the request, as the reader would phrase it
  bin: BinId; // the correct bin
  feedback: string; // the discriminating feature that decides it
}

export interface Bin {
  id: BinId;
  label: string;
  hint: string;
}

export const BINS: Bin[] = [
  { id: "allow", label: "Allow", hint: "friction-free, inside the lines" },
  { id: "deny", label: "Deny", hint: "the gate arrests it" },
];

export const SORT_ITEMS: SortItem[] = [
  {
    id: "edit-cwd",
    label: "Edit a source file inside the project directory",
    bin: "allow",
    feedback: "The write stays inside the working tree, so no deny rule trips.",
  },
  {
    id: "run-tests",
    label: "Run the test suite",
    bin: "allow",
    feedback: "It runs in place and nothing leaves the sandbox.",
  },
  {
    id: "read-deps",
    label: "Read a file under node_modules",
    bin: "allow",
    feedback: "A read with no outward reach is friction-free.",
  },
  {
    id: "exfil-creds",
    label: "Send the contents of a credentials file to an external URL",
    bin: "deny",
    feedback:
      "Credential exfiltration: a secret leaving the machine is the textbook deny.",
  },
  {
    id: "rm-outside",
    label: "Delete a path outside the working directory",
    bin: "deny",
    feedback:
      "A destructive action outside the working directory is irreversible and out of bounds.",
  },
  {
    id: "force-push",
    label: "Force-push to the protected main branch",
    bin: "deny",
    feedback:
      "Force-push to a protected branch rewrites shared history, so the gate arrests it.",
  },
];

// Build-time gate (M10 exit criterion): no option may lack a discriminating
// feedback string. This module is imported by the SSR component, so a violation
// fails the build before any page renders.
for (const it of SORT_ITEMS) {
  if (!it.feedback || it.feedback.trim().length < 12) {
    throw new Error(
      `ScenarioSorter item "${it.id}" lacks a discriminating-feature feedback string`,
    );
  }
}

export const SORT_TOTAL = SORT_ITEMS.length;
