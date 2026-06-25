// How This Harness Works — canvas controller. Same light, editorial language as
// the agent loop (shared look, primitives copied locally so the deployed agent
// loop stays untouched; we DRY into one kit once this becomes the standard).
//
// Picture: six lifecycle moments across the top, one router in the middle that
// every wired moment passes through, the active moment's helpers as pills below,
// and a memory store on the right whose saved notes arc back to "you send a
// message". A token (the session) rides the top timeline left to right.

type EvId =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCompact"
  | "Stop";

const ORDER: EvId[] = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "Stop",
];

// Short labels for the diagram (the full plain phrasing lives in the narrative).
// Kept brief and wrap-friendly so they never collide across the timeline.
const PLAIN: Record<EvId, string> = {
  SessionStart: "Session starts",
  UserPromptSubmit: "Your message",
  PreToolUse: "Before a tool",
  PostToolUse: "After a tool",
  PreCompact: "Before trim",
  Stop: "Turn ends",
};

const WIRED: Record<EvId, boolean> = {
  SessionStart: true,
  UserPromptSubmit: true,
  PreToolUse: false,
  PostToolUse: true,
  PreCompact: true,
  Stop: true,
};

const MODULES: Record<EvId, string[]> = {
  SessionStart: ["Loads a project snapshot"],
  UserPromptSubmit: ["Hands back saved notes"],
  PreToolUse: [],
  PostToolUse: ["Tidies the changed file", "Writes a log line"],
  PreCompact: ["Saves memory"],
  Stop: ["Final safety check"],
};

const C = {
  paper: "#FBFAF6",
  ink: "#2A2620",
  inkSoft: "#6B6457",
  inkFaint: "#A39A8A",
  hair: "#E2DCD0",
  hairStrong: "#CFC7B7",
  context: "#2F6BD8",
  action: "#C9740A",
  verified: "#1F9A63",
  risk: "#D6453F",
  router: "#6A4FB0", // the one structural accent: the router
  white: "#FFFFFF",
};

const FX: Record<EvId, number> = {
  SessionStart: 0.085,
  UserPromptSubmit: 0.235,
  PreToolUse: 0.385,
  PostToolUse: 0.535,
  PreCompact: 0.685,
  Stop: 0.835,
};
const FY_EVENT = 0.17;
const ROUTER = { fx: 0.42, fy: 0.5, fw: 0.26, fh: 0.12 };
const FY_MOD = 0.82;
const MEM = { fx: 0.86, fy: 0.66, fw: 0.13, fh: 0.18 };

interface Dir {
  token: number; // event index for token x
  active: EvId | null;
  done: EvId[];
  modulesFor: EvId | null;
  routerHot: boolean;
  allLines: boolean;
  memoryFill: number; // 0..1
  memoryArc: boolean;
  chip?: {
    kind: "ink" | "ok" | "risk" | "router" | "action";
    text: string;
  } | null;
  bare?: boolean; // plain-Claude-Code mode: hide all wiring
}

const base: Dir = {
  token: 0,
  active: null,
  done: [],
  modulesFor: null,
  routerHot: false,
  allLines: false,
  memoryFill: 0,
  memoryArc: false,
  chip: null,
  bare: false,
};

function upto(i: number): EvId[] {
  return ORDER.slice(0, i);
}

const SCENES: Record<string, Dir> = {
  intro: { ...base, token: 0 },
  start: {
    ...base,
    token: 0,
    active: "SessionStart",
    modulesFor: "SessionStart",
    routerHot: true,
  },
  prompt: {
    ...base,
    token: 1,
    active: "UserPromptSubmit",
    done: upto(1),
    modulesFor: "UserPromptSubmit",
    routerHot: true,
  },
  pre: {
    ...base,
    token: 2,
    active: "PreToolUse",
    done: upto(2),
    modulesFor: "PreToolUse",
  },
  post: {
    ...base,
    token: 3,
    active: "PostToolUse",
    done: upto(3),
    modulesFor: "PostToolUse",
    routerHot: true,
    chip: { kind: "action", text: "two helpers, in order" },
  },
  router: {
    ...base,
    token: 3,
    done: upto(4),
    routerHot: true,
    allLines: true,
    chip: { kind: "router", text: "one router · every wired moment" },
  },
  compact: {
    ...base,
    token: 4,
    active: "PreCompact",
    done: upto(4),
    modulesFor: "PreCompact",
    routerHot: true,
    memoryFill: 1,
  },
  memory: {
    ...base,
    token: 1,
    active: "UserPromptSubmit",
    done: ORDER.slice(0),
    modulesFor: null,
    memoryFill: 1,
    memoryArc: true,
    chip: { kind: "ok", text: "remembered across the gap" },
  },
  play: { ...base, token: 0 },
};

const PLAY_HARNESS: Dir = {
  ...base,
  token: 5,
  done: ORDER.filter((e) => WIRED[e]),
  routerHot: true,
  allLines: true,
  memoryFill: 1,
  memoryArc: true,
  chip: { kind: "ok", text: "This harness — wired" },
};
const PLAY_PLAIN: Dir = {
  ...base,
  token: 0,
  bare: true,
  chip: { kind: "risk", text: "Plain Claude Code — the model alone" },
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

export function initHarnessFlow(): void {
  const canvas = document.getElementById(
    "hf-canvas",
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
  new ResizeObserver(resize).observe(canvas);

  let cur: Dir = SCENES.intro;
  let playing = false;
  let tokenX = FX.SessionStart;
  let targetX = FX.SessionStart;

  function evXY(id: EvId): [number, number] {
    return [FX[id] * W, FY_EVENT * H];
  }
  function nodeR(): number {
    return Math.max(17, Math.min(25, W * 0.024));
  }

  // ---- primitives -------------------------------------------------------
  function circle(cx: number, cy: number, r: number) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  function rr(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function arrow(
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
  // wrap a label into at most two lines that fit maxW (font must be set first)
  function wrapText(text: string, maxW: number): string[] {
    if (ctx.measureText(text).width <= maxW) return [text];
    const words = text.split(" ");
    let a = "";
    let b = "";
    for (const w of words) {
      const trial = a ? a + " " + w : w;
      if (ctx.measureText(trial).width <= maxW || !a) a = trial;
      else b = b ? b + " " + w : w;
    }
    return b ? [a, b] : [a];
  }

  // ---- pieces -----------------------------------------------------------
  function drawLines() {
    // wired event -> router top
    const r = nodeR();
    const rx = ROUTER.fx * W;
    const ry = ROUTER.fy * H;
    const rw = ROUTER.fw * W;
    const rtop = ry - (ROUTER.fh * H) / 2;
    ORDER.forEach((id) => {
      if (!WIRED[id]) return;
      if (cur.bare) return;
      const [ex, ey] = evXY(id);
      const hot = cur.allLines || cur.active === id;
      const target = Math.max(rx - rw / 2 + 14, Math.min(rx + rw / 2 - 14, ex));
      ctx.strokeStyle = hot ? hexA(C.router, 0.85) : C.hair;
      ctx.lineWidth = hot ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(ex, ey + r);
      ctx.bezierCurveTo(ex, ey + r + 40, target, rtop - 40, target, rtop);
      ctx.stroke();
    });
  }

  function drawRouter() {
    const rx = ROUTER.fx * W;
    const ry = ROUTER.fy * H;
    const rw = ROUTER.fw * W;
    const rh = ROUTER.fh * H;
    const x = rx - rw / 2;
    const y = ry - rh / 2;
    const hot = !cur.bare && (cur.routerHot || cur.allLines);
    if (hot) {
      const g = ctx.createRadialGradient(rx, ry, rh * 0.3, rx, ry, rw * 0.7);
      g.addColorStop(0, hexA(C.router, 0.16));
      g.addColorStop(1, hexA(C.router, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - 30, y - 30, rw + 60, rh + 60);
    }
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    rr(x, y, rw, rh, 12);
    ctx.fillStyle = cur.bare ? "#F4F1EA" : C.white;
    ctx.fill();
    ctx.restore();
    rr(x, y, rw, rh, 12);
    ctx.strokeStyle = cur.bare ? C.hairStrong : hot ? C.router : C.hairStrong;
    ctx.lineWidth = hot ? 2.5 : 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = cur.bare ? C.inkFaint : hot ? C.router : C.inkSoft;
    ctx.font = "650 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("Router", rx, ry - 7);
    ctx.font = "500 11.5px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = cur.bare ? C.inkFaint : C.inkFaint;
    ctx.fillText("one entry point", rx, ry + 11);
  }

  function drawEvents() {
    const r = nodeR();
    ORDER.forEach((id, i) => {
      const [cx, cy] = evXY(id);
      const wired = WIRED[id];
      const isDone = cur.done.includes(id) && !cur.bare;
      const isActive = cur.active === id && !cur.bare;

      if (!wired) {
        // the empty moment: dashed hollow always
        circle(cx, cy, r);
        ctx.fillStyle = "#F2EEE6";
        ctx.fill();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = C.inkFaint;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        if (isActive) {
          const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.1);
          g.addColorStop(0, hexA(C.router, 0.26));
          g.addColorStop(1, hexA(C.router, 0));
          ctx.fillStyle = g;
          circle(cx, cy, r * 2.1);
          ctx.fill();
        }
        ctx.save();
        ctx.shadowColor = "rgba(40,38,32,0.12)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        circle(cx, cy, r);
        ctx.fillStyle = C.white;
        ctx.fill();
        ctx.restore();
        circle(cx, cy, r);
        ctx.fillStyle = C.white;
        ctx.fill();
        ctx.strokeStyle = isActive
          ? C.router
          : isDone
            ? C.verified
            : C.hairStrong;
        ctx.lineWidth = isActive ? 2.5 : isDone ? 2 : 1.5;
        ctx.stroke();
      }

      // glyph
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (isDone && wired && !isActive) {
        ctx.strokeStyle = C.verified;
        ctx.lineWidth = 2.3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy);
        ctx.lineTo(cx - 1, cy + 4.5);
        ctx.lineTo(cx + 6, cy - 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = !wired ? C.inkFaint : isActive ? C.router : C.inkSoft;
        ctx.font = "600 12.5px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(String(i + 1), cx, cy + 0.5);
      }

      // label beneath, wrapped to the node's column so labels never collide
      ctx.fillStyle = !wired ? C.inkFaint : isActive ? C.ink : C.inkSoft;
      ctx.font = `${isActive ? "650" : "500"} 11.5px ui-sans-serif, system-ui, sans-serif`;
      const slot = W * 0.15 - 6;
      const lines = wrapText(PLAIN[id], slot);
      let ly = cy + r + 14;
      for (const line of lines) {
        ctx.fillText(line, cx, ly);
        ly += 13.5;
      }
    });
  }

  function drawModules() {
    if (cur.bare || !cur.modulesFor) return;
    const id = cur.modulesFor;
    const mods = MODULES[id];
    const rx = ROUTER.fx * W;
    const rbot = ROUTER.fy * H + (ROUTER.fh * H) / 2;
    const my = FY_MOD * H;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (mods.length === 0) {
      // empty moment
      const txt = "nothing runs here";
      ctx.font = "500 12.5px ui-sans-serif, system-ui, sans-serif";
      const w = ctx.measureText(txt).width + 28;
      const x = rx - w / 2;
      rr(x, my - 15, w, 30, 15);
      ctx.fillStyle = "#F4F1EA";
      ctx.fill();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = C.inkFaint;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.inkFaint;
      ctx.fillText(txt, rx, my + 0.5);
      return;
    }
    const gap = 18;
    ctx.font = "600 12.5px ui-sans-serif, system-ui, sans-serif";
    const widths = mods.map(
      (m) => ctx.measureText(m).width + (mods.length > 1 ? 40 : 28),
    );
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (mods.length - 1);
    let x = rx - totalW / 2;
    mods.forEach((m, k) => {
      const w = widths[k];
      const cxp = x + w / 2;
      // connector router -> pill
      ctx.strokeStyle = hexA(C.router, 0.6);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(rx, rbot);
      ctx.bezierCurveTo(rx, rbot + 26, cxp, my - 30, cxp, my - 15);
      ctx.stroke();
      // pill
      ctx.save();
      ctx.shadowColor = "rgba(40,38,32,0.1)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      rr(x, my - 15, w, 30, 15);
      ctx.fillStyle = C.white;
      ctx.fill();
      ctx.restore();
      rr(x, my - 15, w, 30, 15);
      ctx.strokeStyle = C.hairStrong;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      if (mods.length > 1) {
        // order number
        ctx.fillStyle = C.action;
        ctx.font = "700 11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(String(k + 1), x + 14, my + 0.5);
      }
      ctx.fillStyle = C.ink;
      ctx.font = "600 12.5px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(m, cxp + (mods.length > 1 ? 7 : 0), my + 0.5);
      x += w + gap;
    });
  }

  function drawMemory() {
    const mx = MEM.fx * W;
    const my = MEM.fy * H;
    const mw = MEM.fw * W;
    const mh = MEM.fh * H;
    const x = mx - mw / 2;
    const y = my - mh / 2;
    const lit = cur.memoryFill > 0 && !cur.bare;
    // store box
    rr(x, y, mw, mh, 10);
    ctx.fillStyle = cur.bare ? "#F4F1EA" : C.white;
    ctx.fill();
    rr(x, y, mw, mh, 10);
    ctx.strokeStyle = lit ? C.verified : C.hairStrong;
    ctx.lineWidth = lit ? 2 : 1.4;
    ctx.stroke();
    // fill level
    if (lit) {
      const fh = (mh - 10) * cur.memoryFill;
      rr(x + 5, y + mh - 5 - fh, mw - 10, fh, 6);
      ctx.fillStyle = hexA(C.verified, 0.16);
      ctx.fill();
      // a couple of "note" lines
      ctx.strokeStyle = hexA(C.verified, 0.55);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const ly = y + mh - 14 - i * 9;
        if (ly < y + mh - fh) break;
        ctx.beginPath();
        ctx.moveTo(x + 9, ly);
        ctx.lineTo(x + mw - 9, ly);
        ctx.stroke();
      }
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = lit ? C.verified : C.inkFaint;
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("Memory", mx, y - 12);

    // arc back to UserPromptSubmit
    if (cur.memoryArc && !cur.bare) {
      const [px, py] = evXY("UserPromptSubmit");
      ctx.strokeStyle = hexA(C.verified, 0.8);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(x, my);
      ctx.bezierCurveTo(
        mx - mw,
        my - mh,
        px + 120,
        py + 20,
        px,
        py + nodeR() + 6,
      );
      ctx.stroke();
      ctx.setLineDash([]);
      arrow(
        px + 10,
        py + nodeR() + 16,
        px,
        py + nodeR() + 4,
        hexA(C.verified, 0.9),
        2,
      );
      ctx.fillStyle = C.verified;
      ctx.font = "500 11.5px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("read back next turn", lerp(px, mx, 0.5), H * 0.31);
    }
  }

  function drawToken(t: number) {
    if (cur.bare) return;
    const tx = tokenX * W;
    const ty = FY_EVENT * H;
    const pulse = 1 + Math.sin(t / 320) * 0.08;
    const r = 6.5 * pulse;
    const g = ctx.createRadialGradient(tx, ty, 1, tx, ty, 20);
    g.addColorStop(0, hexA(C.router, 0.5));
    g.addColorStop(1, hexA(C.router, 0));
    ctx.fillStyle = g;
    circle(tx, ty, 20);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = hexA(C.router, 0.7);
    ctx.shadowBlur = 12;
    circle(tx, ty, r);
    ctx.fillStyle = C.white;
    ctx.fill();
    circle(tx, ty, r);
    ctx.fillStyle = hexA(C.router, 0.9);
    ctx.fill();
    ctx.restore();
  }

  function drawChip(t: number) {
    if (!cur.chip) return;
    const map = {
      ink: C.ink,
      ok: C.verified,
      risk: C.risk,
      action: C.action,
      router: C.router,
    } as Record<string, string>;
    const col = map[cur.chip.kind] ?? C.ink;
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    const tw = ctx.measureText(cur.chip.text).width;
    const w = tw + 38;
    const h = 30;
    const x = W / 2 - w / 2;
    const y = H * 0.045;
    ctx.save();
    ctx.shadowColor = hexA(col, 0.25);
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
    rr(x, y, w, h, 15);
    ctx.fillStyle = hexA(col, 0.1);
    ctx.fill();
    ctx.restore();
    rr(x, y, w, h, 15);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = col;
    circle(x + 16, y + h / 2, 4);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(cur.chip.text, x + 28, y + h / 2 + 0.5);
  }

  let last = performance.now();
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const d = targetX - tokenX;
    if (Math.abs(d) > 0.0005) tokenX += d * Math.min(1, dt * 6);
    else tokenX = targetX;
    ctx.clearRect(0, 0, W, H);
    drawLines();
    drawMemory();
    drawRouter();
    drawModules();
    drawEvents();
    drawToken(t);
    drawChip(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function apply(d: Dir) {
    cur = d;
    targetX = FX[ORDER[Math.max(0, Math.min(5, d.token))]];
  }

  function setScene(id: string) {
    if (playing) return;
    const d = SCENES[id];
    if (d) apply(d);
  }

  const steps = Array.from(document.querySelectorAll<HTMLElement>(".hf-step"));
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

  const harnessBtn = document.getElementById("hf-run-harness");
  const plainBtn = document.getElementById("hf-run-plain");
  harnessBtn?.addEventListener("click", () => {
    playing = true;
    harnessBtn.setAttribute("aria-pressed", "true");
    plainBtn?.setAttribute("aria-pressed", "false");
    apply(PLAY_HARNESS);
  });
  plainBtn?.addEventListener("click", () => {
    playing = true;
    plainBtn.setAttribute("aria-pressed", "true");
    harnessBtn?.setAttribute("aria-pressed", "false");
    apply(PLAY_PLAIN);
  });
}
