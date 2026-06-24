// The token economy of per-repo memory, as one arithmetic relationship: a fixed
// memory budget divided by the per-distillation brain cost gives how many times
// the brain can run. Three free tiers cost nothing (SV-5); only the brain is
// billed, so the whole economy is budget ÷ cost = frequency. The numbers are
// illustrative (the brain figure is taught, not measured); the relationship is
// the fact. Pure, build-time-and-client safe, no dependencies.

export const BRAIN_COST = 8000; // tokens per PreCompact distillation (illustrative)
export const DEFAULT_BUDGET = 25000; // tokens allotted to cross-session memory
export const MIN_BUDGET = 8000;
export const MAX_BUDGET = 80000;
export const STEP = 1000;

export interface Frequency {
  runs: number; // whole distillations the budget buys
  spent: number; // tokens those runs cost
  leftover: number; // tokens left, never enough for one more run
}

export function runsFor(budget: number, cost = BRAIN_COST): Frequency {
  const safeCost = cost > 0 ? cost : BRAIN_COST;
  const runs = Math.floor(budget / safeCost);
  const spent = runs * safeCost;
  return { runs, spent, leftover: budget - spent };
}

// The JS-off floor: a static budget-to-frequency table the island enhances.
export const FLOOR_ROWS = [8000, 16000, 25000, 40000, 64000].map((budget) => ({
  budget,
  ...runsFor(budget),
}));
