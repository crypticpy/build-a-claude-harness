// The Agent Loop — canvas controller. Light, editorial, continuous motion.
// Six stages on a line with a loop-back arc; a glowing token rides the path.
// Scroll advances scenes; two buttons run the same request through a strong
// vs a weak harness so the difference is felt, not told. No deps, no blur
// filter (the glow is a canvas radial gradient).

type NodeId = "goal" | "context" | "plan" | "act" | "verify" | "evaluate";
type NodeState = "idle" | "active" | "done" | "failed" | "skipped";

const ORDER: NodeId[] = [
  "goal",
  "context",
  "plan",
  "act",
  "verify",
  "evaluate",
];

const COLOR = {
  paper: "#FBFAF6",
  ink: "#2A2620",
  inkSoft: "#6B6457",
  inkFaint: "#A39A8A",
  hair: "#E2DCD0",
  hairStrong: "#CFC7B7",
  context: "#2F6BD8",
  action: "#E0820A",
  verified: "#1F9A63",
  risk: "#D6453F",
  white: "#FFFFFF",
};

const ACCENT: Record<NodeId, string> = {
  goal: COLOR.ink,
  context: COLOR.context,
  plan: COLOR.ink,
  act: COLOR.action,
  verify: COLOR.verified,
  evaluate: COLOR.ink,
};

const LABEL: Record<NodeId, string> = {
  goal: "Goal",
  context: "Gather context",
  plan: "Plan",
  act: "Use a tool",
  verify: "Verify",
  evaluate: "Evaluate",
};

// Fractional layout, resolved against the live canvas size so it stays crisp
// and responsive. y is the spine; the loop-back arc bows below it.
const FX: Record<NodeId, number> = {
  goal: 0.09,
  context: 0.246,
  plan: 0.402,
  act: 0.558,
  verify: 0.714,
  evaluate: 0.87,
};
const FY = 0.4;

interface Outcome {
  kind: "ok" | "bug" | null;
  text: string;
}

// A scene is a target stop along the journey plus the state each node shows.
interface Directive {
  target: number; // index into the journey stop list
  states: Partial<Record<NodeId, NodeState>>;
  outcome?: Outcome;
  arcHot?: "none" | "warn" | "fail";
}

// The scroll journey: forward, fail + arc back to plan, forward again.
const JOURNEY: NodeId[] = [
  "goal",
  "context",
  "plan",
  "act",
  "verify",
  "evaluate", // 0..5
  "plan",
  "act",
  "verify",
  "evaluate", // 6..9  (second pass)
];

function done(...ids: NodeId[]): Partial<Record<NodeId, NodeState>> {
  const m: Partial<Record<NodeId, NodeState>> = {};
  for (const id of ids) m[id] = "done";
  return m;
}

const SCENE_DIRECTIVE: Record<string, Directive> = {
  intro: { target: 0, states: {} },
  goal: { target: 0, states: { goal: "active" } },
  context: { target: 1, states: { ...done("goal"), context: "active" } },
  plan: { target: 2, states: { ...done("goal", "context"), plan: "active" } },
  act: {
    target: 3,
    states: { ...done("goal", "context", "plan"), act: "active" },
  },
  verify: {
    target: 4,
    states: { ...done("goal", "context", "plan", "act"), verify: "active" },
  },
  fail: {
    target: 6,
    states: {
      ...done("goal", "context", "plan", "act"),
      verify: "failed",
      evaluate: "active",
    },
    arcHot: "fail",
  },
  repass: {
    target: 9,
    states: { ...done("goal", "context", "plan", "act", "verify", "evaluate") },
    outcome: { kind: "ok", text: "Shipped — tests pass" },
  },
  play: { target: 0, states: {} },
};

interface PlayStep {
  target: number;
  states: Partial<Record<NodeId, NodeState>>;
  outcome?: Outcome;
  arcHot?: "none" | "warn" | "fail";
}

// Strong harness: the full loop, including the catch-and-retry.
const STRONG: PlayStep[] = [
  { target: 0, states: { goal: "active" } },
  { target: 1, states: { ...done("goal"), context: "active" } },
  { target: 2, states: { ...done("goal", "context"), plan: "active" } },
  { target: 3, states: { ...done("goal", "context", "plan"), act: "active" } },
  {
    target: 4,
    states: { ...done("goal", "context", "plan", "act"), verify: "active" },
  },
  {
    target: 6,
    states: {
      ...done("goal", "context", "plan", "act"),
      verify: "failed",
      evaluate: "active",
    },
    arcHot: "fail",
  },
  {
    target: 9,
    states: { ...done("goal", "context", "plan", "act", "verify", "evaluate") },
    outcome: { kind: "ok", text: "Shipped — tests pass" },
  },
];

// Weak harness: same model, but it skips reading context and skips verifying.
const WEAK: PlayStep[] = [
  {
    target: 0,
    states: { goal: "active", context: "skipped", verify: "skipped" },
  },
  {
    target: 2,
    states: {
      ...done("goal"),
      context: "skipped",
      plan: "active",
      verify: "skipped",
    },
  },
  {
    target: 3,
    states: {
      ...done("goal", "plan"),
      context: "skipped",
      act: "active",
      verify: "skipped",
    },
  },
  {
    target: 5,
    states: {
      ...done("goal", "plan", "act"),
      context: "skipped",
      verify: "skipped",
      evaluate: "failed",
    },
    outcome: { kind: "bug", text: "Shipped a bug — never checked" },
  },
];
// Weak runs on a shorter path (skips context + verify nodes).
const WEAK_PATH: NodeId[] = ["goal", "plan", "act", "evaluate"];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function initAgentLoop(): void {
  const canvas = document.getElementById(
    "al-canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0;
  let H = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rect.width;
    H = rect.height;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function xy(id: NodeId): [number, number] {
    return [FX[id] * W, FY * H];
  }

  // Token position along the current path's stop list.
  let path: NodeId[] = JOURNEY;
  let states: Partial<Record<NodeId, NodeState>> = {};
  let outcome: Outcome = { kind: null, text: "" };
  let arcHot: "none" | "warn" | "fail" = "none";

  let curProg = 0; // continuous index into `path`
  let targetProg = 0;
  const SPEED = 2.6; // stops per second toward target

  // Sample token position between path stops; the evaluate->plan hop arcs.
  function tokenXY(prog: number): [number, number] {
    const i = Math.max(0, Math.min(path.length - 1, Math.floor(prog)));
    const j = Math.min(path.length - 1, i + 1);
    const f = ease(prog - i);
    const a = xy(path[i]);
    const b = xy(path[j]);
    if (path[i] === "evaluate" && path[j] === "plan") {
      // loop-back arc (quadratic bezier bowing below the spine)
      const cx = lerp(a[0], b[0], 0.5);
      const cy = H * 0.84;
      const mt = 1 - f;
      const x = mt * mt * a[0] + 2 * mt * f * cx + f * f * b[0];
      const y = mt * mt * a[1] + 2 * mt * f * cy + f * f * b[1];
      return [x, y];
    }
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  }

  function segAccent(prog: number): string {
    const j = Math.min(path.length - 1, Math.floor(prog) + 1);
    return ACCENT[path[j]] ?? COLOR.ink;
  }

  // ---- drawing ----------------------------------------------------------
  function roundCircle(cx: number, cy: number, r: number) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }

  function drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    w: number,
  ) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const ah = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - 0.4), y2 - ah * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - ah * Math.cos(ang + 0.4), y2 - ah * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function drawNode(id: NodeId, idx: number) {
    const [cx, cy] = xy(id);
    const st = states[id] ?? "idle";
    const accent = ACCENT[id];
    const r = Math.max(18, Math.min(26, W * 0.026));

    if (st === "skipped") {
      roundCircle(cx, cy, r);
      ctx.fillStyle = "#F2EEE6";
      ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = COLOR.inkFaint;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // soft depth
      ctx.save();
      ctx.shadowColor = "rgba(40,38,32,0.13)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      roundCircle(cx, cy, r);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      ctx.restore();

      // active glow ring (baked radial gradient, not a blur filter)
      if (st === "active") {
        const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
        g.addColorStop(0, hexA(accent, 0.28));
        g.addColorStop(1, hexA(accent, 0));
        ctx.fillStyle = g;
        roundCircle(cx, cy, r * 2.1);
        ctx.fill();
      }

      let ring = COLOR.hairStrong;
      let ringW = 1.5;
      if (st === "active") {
        ring = accent;
        ringW = 2.5;
      } else if (st === "done") {
        ring = COLOR.verified;
        ringW = 2;
      } else if (st === "failed") {
        ring = COLOR.risk;
        ringW = 2.5;
      }
      roundCircle(cx, cy, r);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      ctx.strokeStyle = ring;
      ctx.lineWidth = ringW;
      ctx.stroke();
    }

    // glyph inside: step number, or a check / cross for terminal states
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (st === "done") {
      ctx.strokeStyle = COLOR.verified;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx - 1, cy + 4.5);
      ctx.lineTo(cx + 6, cy - 5);
      ctx.stroke();
    } else if (st === "failed") {
      ctx.strokeStyle = COLOR.risk;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 4.5, cy - 4.5);
      ctx.lineTo(cx + 4.5, cy + 4.5);
      ctx.moveTo(cx + 4.5, cy - 4.5);
      ctx.lineTo(cx - 4.5, cy + 4.5);
      ctx.stroke();
    } else {
      ctx.fillStyle =
        st === "skipped"
          ? COLOR.inkFaint
          : st === "active"
            ? accent
            : COLOR.inkSoft;
      ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(String(idx + 1), cx, cy + 0.5);
    }

    // label beneath
    ctx.fillStyle =
      st === "skipped"
        ? COLOR.inkFaint
        : st === "active"
          ? COLOR.ink
          : COLOR.inkSoft;
    ctx.font = `${st === "active" ? "650" : "500"} 12.5px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(LABEL[id], cx, cy + r + 16);
    if (st === "skipped") {
      const w = ctx.measureText(LABEL[id]).width;
      ctx.strokeStyle = COLOR.inkFaint;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + r + 16);
      ctx.lineTo(cx + w / 2, cy + r + 16);
      ctx.stroke();
    }
  }

  function drawSpine() {
    // straight segments with arrowheads between consecutive nodes
    for (let i = 0; i < ORDER.length - 1; i++) {
      const a = xy(ORDER[i]);
      const b = xy(ORDER[i + 1]);
      const r = Math.max(18, Math.min(26, W * 0.026));
      drawArrow(a[0] + r + 2, a[1], b[0] - r - 4, b[1], COLOR.hairStrong, 1.6);
    }
    // loop-back arc evaluate -> plan
    const e = xy("evaluate");
    const p = xy("plan");
    const r = Math.max(18, Math.min(26, W * 0.026));
    const cx = lerp(e[0], p[0], 0.5);
    const cy = H * 0.84;
    let col = COLOR.hairStrong;
    let wdt = 1.6;
    let dash: number[] = [5, 5];
    if (arcHot === "fail") {
      col = COLOR.risk;
      wdt = 2.2;
      dash = [6, 5];
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(e[0], e[1] + r);
    ctx.quadraticCurveTo(cx, cy, p[0], p[1] + r);
    ctx.stroke();
    ctx.setLineDash([]);
    // arrowhead into plan
    drawArrow(p[0] + 12, p[1] + r + 14, p[0], p[1] + r + 2, col, wdt);
    // arc label
    ctx.fillStyle = arcHot === "fail" ? COLOR.risk : COLOR.inkFaint;
    ctx.font = "500 11.5px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("if a test fails, loop back", cx, cy + 16);
  }

  function drawOutcome() {
    if (!outcome.kind) return;
    const [ex, ey] = xy("evaluate");
    const ok = outcome.kind === "ok";
    const col = ok ? COLOR.verified : COLOR.risk;
    const txt = outcome.text;
    ctx.font = "600 12.5px ui-sans-serif, system-ui, sans-serif";
    const tw = ctx.measureText(txt).width;
    const padX = 12;
    const w = tw + padX * 2 + 16;
    const h = 26;
    const x = Math.min(W - w - 8, ex - w / 2);
    const y = ey - 78;
    ctx.save();
    ctx.shadowColor = hexA(col, 0.28);
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
    roundRect(x, y, w, h, 13);
    ctx.fillStyle = hexA(col, 0.1);
    ctx.fill();
    ctx.restore();
    roundRect(x, y, w, h, 13);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // dot
    ctx.fillStyle = col;
    roundCircle(x + 14, y + h / 2, 4);
    ctx.fill();
    ctx.fillStyle = ok ? COLOR.verified : COLOR.risk;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, x + 26, y + h / 2 + 0.5);
    // little connector down to evaluate
    ctx.strokeStyle = hexA(col, 0.5);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(ex, y + h);
    ctx.lineTo(ex, ey - 28);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawToken(t: number) {
    const [tx, ty] = tokenXY(curProg);
    const col = segAccent(curProg);
    // pulse
    const pulse = 1 + Math.sin(t / 320) * 0.08;
    const r = 6.5 * pulse;
    // glow
    const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, 22);
    g.addColorStop(0, hexA(col, 0.5));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    roundCircle(tx, ty, 22);
    ctx.fill();
    // core
    ctx.save();
    ctx.shadowColor = hexA(col, 0.7);
    ctx.shadowBlur = 12;
    roundCircle(tx, ty, r);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    roundCircle(tx, ty, r);
    ctx.fillStyle = hexA(col, 0.9);
    ctx.fill();
    ctx.restore();
  }

  function frame(t: number) {
    // ease cur toward target
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const dir = Math.sign(targetProg - curProg);
    if (dir !== 0) {
      const step = SPEED * dt;
      if (Math.abs(targetProg - curProg) <= step) curProg = targetProg;
      else curProg += step * dir;
    }
    ctx.clearRect(0, 0, W, H);
    drawSpine();
    drawOutcome();
    ORDER.forEach((id, i) => drawNode(id, i));
    drawToken(t);
    raf = requestAnimationFrame(frame);
  }
  let last = performance.now();
  let raf = requestAnimationFrame(frame);

  // ---- scene application -------------------------------------------------
  function applyDirective(d: Directive | PlayStep) {
    states = { ...d.states };
    targetProg = d.target;
    outcome = d.outcome ?? { kind: null, text: "" };
    arcHot = (d as Directive).arcHot ?? "none";
  }

  function setScene(id: string) {
    if (playing) return; // play mode owns the canvas
    const d = SCENE_DIRECTIVE[id];
    if (d) {
      path = JOURNEY;
      applyDirective(d);
    }
  }

  // scroll -> scene via IntersectionObserver on the narrative steps
  const steps = Array.from(document.querySelectorAll<HTMLElement>(".al-step"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = e.target.getAttribute("data-scene");
          if (id) setScene(id);
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
  );
  steps.forEach((s) => io.observe(s));

  // ---- play mode (strong vs weak) ---------------------------------------
  let playing = false;
  let playTimer = 0;
  function runScript(script: PlayStep[], usePath: NodeId[]) {
    playing = true;
    path = usePath;
    curProg = 0;
    let i = 0;
    const tick = () => {
      if (i >= script.length) {
        playing = false;
        return;
      }
      applyDirective(script[i]);
      i++;
      const delay = i === 1 ? 450 : 1050;
      playTimer = window.setTimeout(tick, delay);
    };
    window.clearTimeout(playTimer);
    tick();
  }

  const strongBtn = document.getElementById("al-run-strong");
  const weakBtn = document.getElementById("al-run-weak");
  strongBtn?.addEventListener("click", () => {
    setPlayActive(strongBtn, weakBtn);
    runScript(STRONG, JOURNEY);
  });
  weakBtn?.addEventListener("click", () => {
    setPlayActive(weakBtn, strongBtn);
    runScript(WEAK, WEAK_PATH);
  });
  function setPlayActive(on: Element | null, off: Element | null) {
    on?.setAttribute("aria-pressed", "true");
    off?.setAttribute("aria-pressed", "false");
  }

  // honor reduced motion: jump straight to the resting frame, no token pulse
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    cancelAnimationFrame(raf);
    const staticFrame = () => {
      ctx.clearRect(0, 0, W, H);
      drawSpine();
      drawOutcome();
      ORDER.forEach((id, i) => drawNode(id, i));
      const [tx, ty] = tokenXY(curProg);
      roundCircle(tx, ty, 6.5);
      ctx.fillStyle = segAccent(curProg);
      ctx.fill();
    };
    // re-render on scene changes only
    const mo = new MutationObserver(staticFrame);
    mo.observe(canvas, { attributes: true });
    setInterval(staticFrame, 250);
  }
}

// hex + alpha -> rgba string
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
