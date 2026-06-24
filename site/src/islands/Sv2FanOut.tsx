/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

// A decorator island for SV-2. One cursor: the run mode (plus an overlap flag).
// It mutates the present lane SVG: locks the disjoint corridors, rides the three
// lane tokens, sweeps the wall-clock line, fills the finish discs, and stamps
// context teardown. It never re-renders. The thesis is in motion: in PARALLEL the
// three leave together and the sweep crosses once; in SEQUENTIAL the sweep crosses
// three times, past the 1-pass ghost line. Overlap forbids parallel outright.
interface Props {
  figureId: string;
  laneIds: string[];
  overlapRule: string;
  wallParallel: string;
  wallSequential: string;
}

const SWEEP_DX = 710; // SWEEP_X1 - SWEEP_X0
const PASS = 900;
const EASE = "cubic-bezier(0.4, 0, 0.6, 1)";

export default function Sv2FanOut({
  figureId,
  laneIds,
  overlapRule,
  wallParallel,
  wallSequential,
}: Props) {
  const [mode, setMode] = useState<"parallel" | "sequential">("parallel");
  const [overlap, setOverlap] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function root(): HTMLElement | null {
    if (!rootRef.current)
      rootRef.current = document.querySelector(`[data-figure="${figureId}"]`);
    return rootRef.current;
  }
  const say = (m: string) => {
    if (liveRef.current) liveRef.current.textContent = m;
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, reduced ? 0 : ms));
  };

  function rideToken(el: HTMLElement, path: string, dur: number) {
    el.style.transform = "none";
    el.style.setProperty("offset-path", `path("${path}")`);
    el.style.transition = "none";
    el.style.setProperty("offset-distance", "0%");
    void el.getBoundingClientRect();
    el.style.transition = reduced ? "none" : `offset-distance ${dur}ms ${EASE}`;
    requestAnimationFrame(() =>
      el.style.setProperty("offset-distance", "100%"),
    );
  }
  function sweep(dur: number) {
    const s = root()?.querySelector(".sweep") as SVGElement | null;
    if (!s) return;
    const el = s as unknown as HTMLElement;
    el.style.transition = "none";
    el.style.transform = "translateX(0px)";
    void el.getBoundingClientRect();
    el.style.transition = reduced ? "none" : `transform ${dur}ms linear`;
    requestAnimationFrame(
      () => (el.style.transform = `translateX(${SWEEP_DX}px)`),
    );
  }

  function reset(r: HTMLElement) {
    clearTimers();
    r.querySelectorAll(".lane-disc").forEach((d) =>
      d.classList.remove("is-filled"),
    );
    r.querySelectorAll(".teardown").forEach((d) =>
      d.classList.remove("is-shown"),
    );
    r.querySelectorAll(".lane-token").forEach((t) => {
      const el = t as unknown as HTMLElement;
      el.style.transition = "none";
      el.style.removeProperty("offset-distance");
    });
  }

  function fill(r: HTMLElement, id: string) {
    r.querySelector(`.lane-disc[data-lane="${id}"]`)?.classList.add(
      "is-filled",
    );
    r.querySelector(`.twin tr[data-lane="${id}"]`)?.setAttribute(
      "aria-current",
      "true",
    );
  }

  function run(nextMode: "parallel" | "sequential", nextOverlap: boolean) {
    const r = root();
    if (!r) return;
    reset(r);
    r.querySelectorAll(".twin tr[aria-current]").forEach((el) =>
      el.removeAttribute("aria-current"),
    );

    // Overlap guard: parallel is refused in front of the learner.
    const guard = r.querySelector(".overlap-guard");
    if (nextOverlap) {
      guard?.classList.add("is-active");
      r.querySelector(".mode-parallel")?.classList.add("is-struck");
      if (nextMode === "parallel") {
        say(`Refused. ${overlapRule}`);
        nextMode = "sequential";
        setMode("sequential");
      }
    } else {
      guard?.classList.remove("is-active");
      r.querySelector(".mode-parallel")?.classList.remove("is-struck");
    }

    // Lock the disjoint corridors — the precondition for parallelism.
    r.querySelectorAll(".lane-sep").forEach((s) =>
      s.classList.toggle("is-locked", !nextOverlap),
    );

    if (nextMode === "parallel") {
      r.querySelector(".ghost-tick")?.classList.add("is-active");
      laneIds.forEach((id, i) => {
        const t = r.querySelector(
          `.lane-token[data-lane="${id}"]`,
        ) as SVGElement | null;
        const y = [86, 170, 254][i];
        if (t)
          rideToken(t as unknown as HTMLElement, `M150,${y} L824,${y}`, PASS);
      });
      sweep(PASS);
      after(PASS + 40, () => laneIds.forEach((id) => fill(r, id)));
      say(wallParallel);
    } else {
      r.querySelector(".ghost-tick")?.classList.remove("is-active");
      // Three serial passes: each disc fills, its context tears down, then the next departs.
      laneIds.forEach((id, i) => {
        const y = [86, 170, 254][i];
        after(i * PASS, () => {
          const t = r.querySelector(
            `.lane-token[data-lane="${id}"]`,
          ) as SVGElement | null;
          if (t)
            rideToken(t as unknown as HTMLElement, `M150,${y} L824,${y}`, PASS);
          sweep(PASS);
        });
        after((i + 1) * PASS, () => {
          fill(r, id);
          r.querySelector(`.teardown[data-lane="${id}"]`)?.classList.add(
            "is-shown",
          );
        });
      });
      say(wallSequential);
    }
  }

  useEffect(() => {
    hostRef.current?.setAttribute("data-ready", "");
    root()?.setAttribute("data-fanout-ready", "");
    run("parallel", false);
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickMode = (m: "parallel" | "sequential") => {
    setMode(m);
    run(m, overlap);
  };
  const toggleOverlap = () => {
    const o = !overlap;
    setOverlap(o);
    run(mode, o);
  };

  return (
    <div
      ref={hostRef}
      class="trace-controls fanout-controls"
      role="group"
      aria-label="Fan-out controls"
    >
      <div class="gate-toggle" role="radiogroup" aria-label="Run mode">
        <button
          class="tp-btn mode-parallel"
          type="button"
          role="radio"
          aria-checked={mode === "parallel"}
          aria-disabled={overlap}
          onClick={() => pickMode("parallel")}
        >
          PARALLEL
        </button>
        <button
          class="tp-btn"
          type="button"
          role="radio"
          aria-checked={mode === "sequential"}
          onClick={() => pickMode("sequential")}
        >
          SEQUENTIAL
        </button>
      </div>
      <button
        class="tp-btn"
        type="button"
        aria-pressed={overlap}
        onClick={toggleOverlap}
      >
        {overlap ? "file-sets: overlapping" : "file-sets: disjoint"}
      </button>
      <p ref={liveRef} class="tp-live visually-hidden" aria-live="polite"></p>
    </div>
  );
}
