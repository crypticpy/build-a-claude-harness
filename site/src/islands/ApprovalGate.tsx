/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";

// A decorator island for SV-4. It holds one cursor (the staged request) plus a
// denyByDefault flag, and mutates the already-present static SVG: it stages a
// chip, rides the token to the boundary, and choreographs the verdict. ALLOW
// glides past and dims (safe things do not interrupt you); DENY arrests at the
// boundary, lights its one matched named-harm rule with the real reason, speaks
// the why into the gate, and reverses to the human. It never re-renders content.
export interface GateCase {
  id: string;
  command: string;
  verdict: "ALLOW" | "DENY";
  matchedRule: string;
  why: string;
}

interface Props {
  figureId: string;
  cases: GateCase[];
  nightCalm: string;
  nightFlood: string;
}

const TRANSIT = "cubic-bezier(0.4, 0, 0.6, 1)";
const ARREST = "cubic-bezier(0.16, 1, 0.3, 1)"; // the only decelerate-to-dead-stop
const TRUNK = "M250,172 L506,172 L720,172";
const ALLOW_CONT = "M720,172 L884,172";
const PARK = "78%";

export default function ApprovalGate({
  figureId,
  cases,
  nightCalm,
  nightFlood,
}: Props) {
  const [staged, setStaged] = useState<string | null>(null);
  const [denyByDefault, setDenyByDefault] = useState(false);
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
  const say = (msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg;
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, reduced ? 0 : ms));
  };

  function ride(
    el: HTMLElement,
    path: string,
    from: string,
    to: string,
    dur: number,
    ease: string,
  ) {
    el.style.transform = "none";
    el.style.setProperty("offset-path", `path("${path}")`);
    el.style.transition = "none";
    el.style.setProperty("offset-distance", from);
    void el.getBoundingClientRect();
    el.style.transition = reduced ? "none" : `offset-distance ${dur}ms ${ease}`;
    requestAnimationFrame(() => el.style.setProperty("offset-distance", to));
  }

  function place(id: string) {
    const r = root();
    const c = cases.find((x) => x.id === id);
    if (!r || !c) return;
    clearTimers();
    setStaged(id);

    // Reset prior verdict (but the human-glyph persists for the session).
    r.querySelectorAll("[data-chip]").forEach((el) =>
      el.classList.remove("is-staged"),
    );
    r.querySelectorAll("[data-rule]").forEach((el) =>
      el.classList.remove("is-lit", "is-allow"),
    );
    r.querySelectorAll("[data-why]").forEach((el) =>
      el.classList.remove("is-shown"),
    );
    r.querySelectorAll(".twin tr[aria-current]").forEach((el) =>
      el.removeAttribute("aria-current"),
    );
    const diamond = r.querySelector(".gate-diamond");
    diamond?.classList.remove("is-deny");
    diamond?.classList.add("is-armed");

    r.querySelector(`[data-chip="${id}"]`)?.classList.add("is-staged");
    r.querySelector(`.twin tr[data-case="${id}"]`)?.setAttribute(
      "aria-current",
      "true",
    );
    say(`Staged ${c.command}.`);

    const token = r.querySelector(".token") as SVGElement | null;
    const el = token as unknown as HTMLElement | null;
    if (el) {
      token!.classList.remove("is-dimmed");
      token!.classList.add("is-active");
      if (c.verdict === "ALLOW") {
        ride(el, TRUNK, "0%", "100%", 320, TRANSIT);
        after(360, () => {
          ride(el, ALLOW_CONT, "0%", "100%", 200, TRANSIT);
          after(220, () => token!.classList.add("is-dimmed"));
          r.querySelector(`[data-rule="default-allow"]`)?.classList.add(
            "is-allow",
          );
          diamond?.classList.remove("is-armed");
          say(
            `${c.command} passed silently in about 220 milliseconds. Safe requests do not interrupt you.`,
          );
        });
      } else {
        ride(el, TRUNK, "0%", "100%", 600, ARREST); // decelerate to a dead stop
        after(620, () => {
          r.querySelector(`[data-rule="${c.matchedRule}"]`)?.classList.add(
            "is-lit",
          );
          r.querySelector(`[data-why="${id}"]`)?.classList.add("is-shown");
          diamond?.classList.add("is-deny");
          r.querySelector(".gate-human")?.classList.add("is-lit"); // persists
          el.style.transition = reduced
            ? "none"
            : `offset-distance 300ms ${TRANSIT}`;
          requestAnimationFrame(() =>
            el.style.setProperty("offset-distance", PARK),
          ); // reverse to human
          say(
            `${c.command} stopped at the boundary. Matched ${c.matchedRule}: ${c.why}. Handed to the human.`,
          );
        });
      }
    }
  }

  function detonate(deny: boolean) {
    setDenyByDefault(deny);
    const r = root();
    r?.querySelector(".night")?.classList.toggle("is-flooded", deny);
    say(
      deny ? `Deny-by-default: ${nightFlood}.` : `Default-allow: ${nightCalm}.`,
    );
  }

  // Attach select-then-place behavior to the SSR chips (decorator pattern).
  useEffect(() => {
    const r = root();
    if (!r) return;
    const chips = Array.from(r.querySelectorAll<HTMLElement>("[data-chip]"));
    const onClick = (e: Event) => {
      const id = (e.currentTarget as HTMLElement).getAttribute("data-chip");
      if (id) place(id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const id = (e.currentTarget as HTMLElement).getAttribute("data-chip");
        if (id) place(id);
      }
    };
    chips.forEach((c) => {
      // Promote to an operable control only now that JS can drive it. SSR leaves
      // the chip a plain <g>, so JS-off readers never tab into an inert button.
      c.setAttribute("tabindex", "0");
      c.setAttribute("role", "button");
      c.addEventListener("click", onClick);
      c.addEventListener("keydown", onKey as EventListener);
    });
    hostRef.current?.setAttribute("data-ready", "");
    r.setAttribute("data-gate-ready", "");
    return () => {
      chips.forEach((c) => {
        c.removeAttribute("tabindex");
        c.removeAttribute("role");
        c.removeEventListener("click", onClick);
        c.removeEventListener("keydown", onKey as EventListener);
      });
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      class="gate-controls"
      role="group"
      aria-label="Approval gate"
    >
      <p class="gate-hint mono">
        {staged
          ? "Place another request, or flip the run mode below."
          : "Select a request, then press Enter to place it on the gate."}
      </p>
      <div class="gate-toggle" role="radiogroup" aria-label="Run mode">
        <button
          class="tp-btn"
          type="button"
          role="radio"
          aria-checked={!denyByDefault}
          onClick={() => detonate(false)}
        >
          default-allow
        </button>
        <button
          class="tp-btn"
          type="button"
          role="radio"
          aria-checked={denyByDefault}
          onClick={() => detonate(true)}
        >
          deny-by-default
        </button>
      </div>
      <p ref={liveRef} class="gate-live visually-hidden" aria-live="polite"></p>
    </div>
  );
}
