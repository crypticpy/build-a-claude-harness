/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

// A decorator island: it holds ONE integer step cursor and mutates the
// already-present static SVG (toggling classes, moving the single token). It
// never re-renders diagram content. The static SVG + the data twin already
// teach the whole lesson JS-off; this adds motion and narration.
export interface StepView {
  litNodes: string[];
  litEdges: string[];
  // Nodes the token has already passed: dimly lit as a trail so the eye reads
  // direction and progress, not just a single hop.
  visited?: string[];
  // Token motion is one of two modes: a point (translate, SV-1) or a ride along
  // an edge path (CSS offset-path, SV-3). tokenPath wins when both are present.
  tokenX?: number;
  tokenY?: number;
  tokenPath?: string;
  // The signature fan-out beat (SV-1 PostToolUse): after the main token lands,
  // two capsules ride two sub-wire paths into two module glyphs, in fire order.
  fanout?: { paths: string[] };
  // Cumulative count of accreted disk lines visible at this step (SV-3 memory).
  diskLines?: number;
  drawer?: string;
  narration: string;
}

interface Props {
  figureId: string;
  steps: StepView[];
  labels?: string[];
  // Run the one sanctioned once-through walk when the figure hydrates into view.
  autoplay?: boolean;
}

const TRANSIT = "transform 0.24s cubic-bezier(0.4, 0, 0.6, 1)";

export default function TracePlayer({
  figureId,
  steps,
  labels,
  autoplay,
}: Props) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const timer = useRef<number | null>(null);
  const autoplayed = useRef(false);

  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function root(): HTMLElement | null {
    if (!rootRef.current)
      rootRef.current = document.querySelector(`[data-figure="${figureId}"]`);
    return rootRef.current;
  }

  function apply(i: number) {
    const r = root();
    if (!r) return;
    const s = steps[i];
    r.querySelectorAll(".is-lit").forEach((el) =>
      el.classList.remove("is-lit"),
    );
    r.querySelectorAll(".is-visited").forEach((el) =>
      el.classList.remove("is-visited"),
    );
    r.querySelectorAll("[data-capsule]").forEach((el) => {
      el.classList.remove("is-active");
      (el as HTMLElement).style.removeProperty("offset-path");
    });
    r.querySelectorAll("[data-drawer]").forEach(
      (el) => ((el as HTMLElement).hidden = true),
    );
    r.querySelectorAll(".twin tr[aria-current]").forEach((el) =>
      el.removeAttribute("aria-current"),
    );
    if (!s) return;
    // The trail: every node already passed sits dimly lit behind the live one.
    s.visited?.forEach((id) => {
      const node = r.querySelector(`[data-node-id="${id}"]`);
      if (node && !s.litNodes.includes(id)) node.classList.add("is-visited");
    });
    s.litNodes.forEach((id) =>
      r.querySelector(`[data-node-id="${id}"]`)?.classList.add("is-lit"),
    );
    s.litEdges.forEach((id) =>
      r.querySelector(`[data-edge-id="${id}"]`)?.classList.add("is-lit"),
    );
    const token = r.querySelector(".token:not(.capsule)") as SVGElement | null;
    if (token) {
      const el = token as unknown as HTMLElement;
      if (s.tokenPath) {
        // Ride the edge: pin to the path at 0%, then transition offset-distance
        // to 100%. A CSS transition persists the end state (WAAPI reverts).
        // Clear point-mode transform so it does not compose with the motion path.
        token.classList.add("is-active");
        el.style.transform = "none";
        el.style.setProperty("offset-path", `path("${s.tokenPath}")`);
        el.style.transition = "none";
        el.style.setProperty("offset-distance", "0%");
        void el.getBoundingClientRect(); // commit the 0% start before animating
        el.style.transition = reduced
          ? "none"
          : "offset-distance 0.6s cubic-bezier(0.4, 0, 0.6, 1)";
        requestAnimationFrame(() =>
          el.style.setProperty("offset-distance", "100%"),
        );
      } else if (s.tokenX != null) {
        // Point mode: clear any motion path so translate positions cleanly.
        token.classList.add("is-active");
        el.style.removeProperty("offset-path");
        el.style.removeProperty("offset-distance");
        el.style.transition = reduced ? "none" : TRANSIT;
        el.style.transform = `translate(${s.tokenX}px, ${s.tokenY ?? 0}px)`;
      }
    }
    // The fan-out: two capsules ride two sub-wires into two module glyphs in
    // fire order, after the main token has arrived. "One event, two hooks."
    if (s.fanout) {
      const delay = reduced ? 0 : 360; // let the main token land first
      s.fanout.paths.forEach((p, k) => {
        const cap = r.querySelector(
          `[data-capsule="${k}"]`,
        ) as HTMLElement | null;
        if (!cap) return;
        cap.style.setProperty("offset-path", `path("${p}")`);
        cap.style.transition = "none";
        cap.style.setProperty("offset-distance", "0%");
        cap.classList.add("is-active");
        void cap.getBoundingClientRect();
        const stagger = reduced ? 0 : k * 140;
        window.setTimeout(() => {
          cap.style.transition = reduced
            ? "none"
            : "offset-distance 0.5s cubic-bezier(0.4, 0, 0.6, 1)";
          requestAnimationFrame(() =>
            cap.style.setProperty("offset-distance", "100%"),
          );
        }, delay + stagger);
      });
    }
    if (s.diskLines != null) {
      r.querySelectorAll("[data-disk-line]").forEach((el) => {
        const idx = Number(el.getAttribute("data-disk-line"));
        el.classList.toggle("is-shown", idx < (s.diskLines ?? 0));
      });
    }
    if (s.drawer) {
      const d = r.querySelector(
        `[data-drawer="${s.drawer}"]`,
      ) as HTMLElement | null;
      if (d) d.hidden = false;
    }
    const row = r.querySelector(`.twin tr[data-step="${i}"]`);
    if (row) row.setAttribute("aria-current", "true");
    if (liveRef.current) liveRef.current.textContent = s.narration;
  }

  useEffect(() => {
    apply(step);
    // Signal hydration completion (idempotent) so the figure can style controls
    // as ready and tests can wait deterministically past the SSR-control
    // hydration window.
    hostRef.current?.setAttribute("data-ready", "");
    root()?.setAttribute("data-trace-ready", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // The one sanctioned autoplay: a single once-through walk when the figure
  // hydrates into view. Reduced-motion opts out; any control press cancels it.
  useEffect(() => {
    if (!autoplay || reduced || autoplayed.current) return;
    autoplayed.current = true;
    const t = window.setTimeout(() => setPlaying(true), 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = window.setInterval(
      () => {
        setStep((s) => {
          if (s + 1 >= steps.length) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      },
      reduced ? 350 : 1100,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const stop = () => setPlaying(false);
  const total = steps.length;

  return (
    <div
      ref={hostRef}
      class="trace-controls"
      role="group"
      aria-label="Trace player"
    >
      <button
        class="tp-btn"
        type="button"
        aria-pressed={playing}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        class="tp-btn"
        type="button"
        onClick={() => {
          stop();
          setStep((s) => Math.max(0, s - 1));
        }}
        disabled={step === 0}
        aria-label="Previous step"
      >
        Prev
      </button>
      <button
        class="tp-btn"
        type="button"
        onClick={() => {
          stop();
          setStep((s) => Math.min(total - 1, s + 1));
        }}
        disabled={step >= total - 1}
        aria-label="Next step"
      >
        Next
      </button>
      <label class="tp-scrub">
        <span class="visually-hidden">Step</span>
        <input
          type="range"
          min={0}
          max={total - 1}
          value={step}
          onInput={(e) => {
            stop();
            setStep(Number((e.target as HTMLInputElement).value));
          }}
        />
      </label>
      <span class="tp-counter mono" aria-hidden="true">
        STEP {step + 1} / {total}
      </span>
      <p ref={liveRef} class="tp-live visually-hidden" aria-live="polite"></p>
    </div>
  );
}
