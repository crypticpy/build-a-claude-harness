// SV-4 Safe-Autonomy Approval Gate — the Phase-2 climax. A second cheap gate that
// default-allows everything except five named harms is what lets an agent run for
// hours unattended; flipping it to deny-by-default does not make it safer, it makes
// it unusable. All data is precomputed at build by the provenance gate (running
// the real evaluate-policy rules), so the SVG verdict, the twin row, and the static
// floor are literally the same objects. Build-time only.
import models from "../generated/models.json";

export interface RequestCase {
  id: string;
  command: string;
  shape: "safe" | "harm";
  verdict: "ALLOW" | "DENY";
  matchedRule: string;
  why: string;
}
export interface RuleRow {
  id: string;
  why: string;
}
export interface RunCost {
  mode: "default-allow" | "deny-by-default";
  humanPrompts: number;
  illustrative: boolean;
}

export const chips = models.requestCases as RequestCase[];
// The five named harms, plus the default-allow fallthrough as the sixth (quiet) row.
export const ruleRows: RuleRow[] = [
  ...(models.denyRules as RuleRow[]),
  { id: "default-allow", why: "no named harm matched" },
];
const cost = models.runCost as RunCost[];
export const costByMode = {
  "default-allow": cost.find((c) => c.mode === "default-allow")!,
  "deny-by-default": cost.find((c) => c.mode === "deny-by-default")!,
};

// ── Verbatim teaching captions. CI greps these against the gate's honesty band;
// they are the truth that travels in every screenshot. ───────────────────────
export const CAVEAT_TOP = "a friction tool, not a security boundary";
export const CAVEAT_BOTTOM =
  "deterministic stand-in for the real LLM gate, course-taught, not a wired harness layer";
export const RATIO_STAMP =
  "realistic ratio is thousands to one; three harms shown for legibility";

// The detonation reframes magnitude as a stolen night, not a bar.
export const NIGHT_CALM = `${costByMode["default-allow"].humanPrompts} soft pings across eight hours — you slept`;
export const NIGHT_FLOOD = `${costByMode["deny-by-default"].humanPrompts}, one every 1.9 minutes, all night`;

// ── Shared gate geometry, so the island and the static SVG agree on coordinates.
export const GY = 172; // the event wire's height
export const DOCK_OUT_X = 250;
export const GATE_X = 506;
export const BOUNDARY_X = 720;
export const ALLOW_END_X = 884;
export const DENY_PARK_PCT = "78%"; // token reverses to here on the trunk (handed back)

// The single amber event-payload wire: dock outlet → gate diamond → boundary.
export const TRUNK_PATH = `M${DOCK_OUT_X},${GY} L${GATE_X},${GY} L${BOUNDARY_X},${GY}`;
// The allow continuation past the (near-invisible) boundary, where it dims off-stage.
export const ALLOW_PATH = `M${BOUNDARY_X},${GY} L${ALLOW_END_X},${GY}`;

// ── Overnight timeline (11pm → 7am). Calm shows a few pings; the flood maps the
// deny-by-default prompt count onto the same eight hours. Baked at build, revealed
// by one class toggle with staggered transition-delay (zero per-tick DOM/JS).
export function nightPings(count: number, x0: number, x1: number): number[] {
  if (count <= 1) return [(x0 + x1) / 2];
  const span = x1 - x0;
  return Array.from({ length: count }, (_, i) => x0 + (span * i) / (count - 1));
}
