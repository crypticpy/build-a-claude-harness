// SV-2 Orchestrator-to-Subagent Fan-Out. The felt thesis: isolation is what buys
// the parallelism. Three subagents run at once precisely because their file-sets
// never touch (the real rule from CLAUDE.md). The win is a measured wall-clock
// fact, never confetti; the danger (overlap) is why the sequential fallback
// exists. Build-time only; the lanes are mutated at runtime by a decorator island.

export interface SubAgent {
  id: string;
  name: string;
  objective: string;
  owns: string[];
}

// Three real, disjoint workstreams in this repo. The paths exist at the pinned SHA.
export const subagents: SubAgent[] = [
  {
    id: "format",
    name: "format",
    objective: "format the edited file",
    owns: ["hooks/unified/modules/format-lint.mjs"],
  },
  {
    id: "log",
    name: "log",
    objective: "record the turn",
    owns: ["hooks/unified/modules/rolling-log.mjs"],
  },
  {
    id: "impact",
    name: "impact",
    objective: "map downstream consumers",
    owns: ["plugins/context-layer/src/tools/impact-check.ts"],
  },
];

// The overlap scenario: impact also claims rolling-log.mjs, so two agents would
// write the same file. disjoint() is the pure build-time guard the row mirrors.
export const overlapClaim = "hooks/unified/modules/rolling-log.mjs";

export function disjoint(agents: { owns: string[] }[]): boolean {
  const seen = new Set<string>();
  for (const a of agents) {
    for (const f of a.owns) {
      if (seen.has(f)) return false;
      seen.add(f);
    }
  }
  return true;
}

// The verbatim safety rule, from the repo's own CLAUDE.md. CI greps it.
export const OVERLAP_RULE =
  "Never assign overlapping files to two parallel agents. If files would overlap, sequence the work instead.";

// The measured wall-clock fact, stated plainly.
export const WALLCLOCK_PARALLEL =
  "PARALLEL: one wall-clock pass — the three finish together.";
export const WALLCLOCK_SEQUENTIAL =
  "SEQUENTIAL: three passes — the same work, serialized.";

// ── Lane geometry, shared by the SVG and the island. ─────────────────────────
export const W = 1000;
export const H = 360;
export const LANE_Y = [86, 170, 254];
export const HUB_X = 120;
export const START_X = 150;
export const FINISH_X = 824;
export const SWEEP_X0 = 150;
export const SWEEP_X1 = 860;
export const SEP_Y = [128, 212]; // disjoint corridors between the three lanes

export const lanePath = (y: number): string =>
  `M${START_X},${y} L${FINISH_X},${y}`;
