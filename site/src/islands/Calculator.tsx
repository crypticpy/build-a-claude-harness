/** @jsxImportSource preact */
import { useState } from "preact/hooks";
import { useEffect, useRef } from "preact/hooks";
import {
  BRAIN_COST,
  DEFAULT_BUDGET,
  MIN_BUDGET,
  MAX_BUDGET,
  STEP,
  runsFor,
} from "../lib/calc";

// The one genuinely stateful teaching island for P1-M7: a memory-budget slider.
// It holds a single piece of app state (the budget) and recomputes the frequency
// live. The static floor table beside it (SSR, in the wrapper) carries the lesson
// JS-off; this just lets the reader probe a point on that curve.
interface Props {
  cost?: number;
}

export default function Calculator({ cost = BRAIN_COST }: Props) {
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const { runs, leftover } = runsFor(budget, cost);
  const word = runs === 1 ? "distillation" : "distillations";
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Hydration signal for tests and progressive-enhancement styling.
  useEffect(() => {
    rootRef.current?.setAttribute("data-ready", "");
  }, []);

  return (
    <div
      class="calc"
      role="group"
      aria-label="Memory budget calculator"
      ref={rootRef}
    >
      <div class="calc-control">
        <label class="calc-label" for="calc-budget">
          Memory budget for the session
        </label>
        <div class="calc-slider-row">
          <input
            id="calc-budget"
            class="calc-slider"
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={STEP}
            value={budget}
            aria-describedby="calc-out"
            onInput={(e) =>
              setBudget(Number((e.currentTarget as HTMLInputElement).value))
            }
          />
          <span class="calc-budget-val mono">{budget.toLocaleString()}</span>
        </div>
      </div>

      <output
        id="calc-out"
        class="calc-out"
        for="calc-budget"
        aria-live="polite"
      >
        <span class="calc-runs mono">{runs}</span>
        <span class="calc-runs-label">
          brain {word} at {cost.toLocaleString()} tokens each
        </span>
        {leftover > 0 && (
          <span class="calc-rem">
            {leftover.toLocaleString()} tokens left over, short of one more run.
          </span>
        )}
      </output>
    </div>
  );
}
