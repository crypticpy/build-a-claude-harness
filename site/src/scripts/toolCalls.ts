// Tool calls — canvas controller. The harness offers the model a list of tools.
// The model calls the one that fits the task; the harness runs it on "your
// computer"; the result comes back as context. One round trip. Scroll drives
// the scenes; the last scene lets the reader pick a tool and watch the trip.
// Wrong picks are not failures — every tool runs and returns; they just answer
// a different question, so a miss is amber with a nudge, never a red error.
// Built on ./kit.

import {
  COLOR,
  arrow,
  circle,
  clamp,
  ease,
  glow,
  hexA,
  lerp,
  makeSurface,
  observeScenes,
  prefersReducedMotion,
  roundRect,
  SANS,
  MONO,
} from "./kit";

type Phase = "idle" | "call" | "run" | "result";
interface Result {
  kind: "ok" | "miss" | null;
  text: string;
  hint: string;
}

// The tools the harness offers. `fit` = the right one for "what's in README.md".
// Every tool returns something; only Read file answers this particular task.
const TOOLS = [
  {
    id: "read",
    label: "Read file",
    fit: true,
    text: "Returned the file's text",
  },
  {
    id: "bash",
    label: "Run command",
    fit: false,
    text: "Ran, not the file's text",
  },
  {
    id: "edit",
    label: "Edit file",
    fit: false,
    text: "Changed it, didn't read it",
  },
  {
    id: "grep",
    label: "Search code",
    fit: false,
    text: "Found names, not the text",
  },
];
const HINT = "Read file is the one that answers this.";

export function initToolCalls(): void {
  const s = makeSurface("tc-canvas");
  if (!s) return;
  const { ctx, size } = s;

  let phase: Phase = "idle";
  let selectedId: string | null = null;
  let toolboxAlpha = 1; // dim in the intro to keep focus on "only text"
  let result: Result = { kind: null, text: "", hint: "" };
  let modelActive = false;

  // token progress: 0..1 model->harness (the call), 1..2 harness->model (result)
  let cur = 0;
  let target = 0;
  const SPEED = 1.8;

  const reduce = prefersReducedMotion();

  function modelXY(): [number, number] {
    return [size.w * 0.2, size.h * 0.42];
  }
  function panelGeom() {
    const w = Math.min(204, size.w * 0.44);
    const x = size.w - w - Math.max(10, size.w * 0.04);
    const titleH = 28;
    const rowH = 30;
    const h = titleH + TOOLS.length * rowH + 12;
    const y = size.h * 0.42 - h / 2;
    return { x, y, w, h, titleH, rowH };
  }
  // the harness endpoint the token travels to: left-middle of the toolbox
  function harnessXY(): [number, number] {
    const g = panelGeom();
    return [g.x, size.h * 0.42];
  }
  function rowCY(i: number): number {
    const g = panelGeom();
    return g.y + g.titleH + i * g.rowH + g.rowH / 2;
  }

  function tokenXY(p: number): [number, number] {
    const [mx, my] = modelXY();
    const [tx, ty] = harnessXY();
    if (p <= 1) {
      const f = ease(clamp(p, 0, 1));
      return [lerp(mx, tx, f), lerp(my, ty, f) - bow(f)];
    }
    const f = ease(clamp(p - 1, 0, 1));
    return [lerp(tx, mx, f), lerp(ty, my, f) + bow(f)];
  }
  function bow(f: number): number {
    return Math.sin(f * Math.PI) * (size.h * 0.12);
  }

  function selectedAccent(): string {
    // green when the tool fit (or is mid-run); amber when it ran but answered a
    // different question — a miss is never a red error, just the wrong fit.
    if (result.kind === "ok") return COLOR.verified;
    if (result.kind === "miss") return COLOR.action;
    return phase === "run" ? COLOR.verified : COLOR.action;
  }

  function drawModel() {
    const [cx, cy] = modelXY();
    const w = Math.min(132, size.w * 0.26);
    const h = Math.max(58, size.h * 0.13);
    const x = cx - w / 2;
    const y = cy - h / 2;
    if (modelActive) glow(ctx, cx, cy, w * 0.95, COLOR.context, 0.2);
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 14);
    ctx.strokeStyle = modelActive ? COLOR.context : COLOR.hairStrong;
    ctx.lineWidth = modelActive ? 2.2 : 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = modelActive ? COLOR.context : COLOR.ink;
    ctx.font = `650 15px ${SANS}`;
    ctx.fillText("Model", cx, cy - 2);
    ctx.fillStyle = COLOR.inkSoft;
    ctx.font = `500 12px ${SANS}`;
    ctx.fillText("writes text", cx, cy + 16);
  }

  function drawToolbox() {
    const g = panelGeom();
    const runActive = phase === "run";
    ctx.globalAlpha = toolboxAlpha;

    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.1)";
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, g.x, g.y, g.w, g.h, 14);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, g.x, g.y, g.w, g.h, 14);
    ctx.strokeStyle = runActive ? COLOR.verified : COLOR.hairStrong;
    ctx.lineWidth = runActive ? 2.1 : 1.5;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `600 9.5px ${MONO}`;
    ctx.fillText("TOOLS THE HARNESS OFFERS", g.x + 13, g.y + 18);

    const accent = selectedAccent();
    TOOLS.forEach((t, i) => {
      const cy = rowCY(i);
      const sel = t.id === selectedId;
      if (sel) {
        roundRect(ctx, g.x + 6, cy - g.rowH / 2 + 2, g.w - 12, g.rowH - 4, 9);
        ctx.fillStyle = hexA(accent, 0.1);
        ctx.fill();
        roundRect(ctx, g.x + 6, cy - g.rowH / 2 + 2, g.w - 12, g.rowH - 4, 9);
        ctx.strokeStyle = hexA(accent, 0.55);
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
      circle(ctx, g.x + 19, cy, 3.2);
      ctx.fillStyle = sel ? accent : COLOR.inkFaint;
      ctx.fill();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = sel ? COLOR.ink : COLOR.inkSoft;
      ctx.font = `${sel ? "650" : "500"} 12.5px ${SANS}`;
      ctx.fillText(t.label, g.x + 31, cy);
      ctx.textBaseline = "alphabetic";
    });
    ctx.globalAlpha = 1;
  }

  function drawGround() {
    const g = panelGeom();
    const y = g.y + g.h + 20;
    ctx.globalAlpha = toolboxAlpha;
    ctx.strokeStyle = COLOR.hairStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x - 6, y);
    ctx.lineTo(g.x + g.w + 6, y);
    ctx.stroke();
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("YOUR COMPUTER", g.x + g.w / 2, y + 15);
    // dashed tie from the toolbox down to the ground
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = COLOR.hair;
    ctx.beginPath();
    ctx.moveTo(g.x + g.w / 2, g.y + g.h);
    ctx.lineTo(g.x + g.w / 2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function drawArcs() {
    const [mx, my] = modelXY();
    const [tx, ty] = harnessXY();
    const bw = Math.min(132, size.w * 0.26) / 2;
    const ax1 = mx + bw + 4; // arc start, just off the model box
    const ax2 = tx - 8; // arc end, at the toolbox
    // faint directional arrows: out on top (the call), back on the bottom (the
    // result). The token's colour and the legend name each leg, so no inline
    // text label is needed — it would not fit the gap on a narrow canvas anyway.
    ctx.globalAlpha = 0.5;
    arrow(ctx, ax1, my - 22, ax2, ty - 22, COLOR.hair, 1.5);
    arrow(ctx, ax2, ty + 22, ax1, my + 22, COLOR.hair, 1.5);
    ctx.globalAlpha = 1;
  }

  function drawResult() {
    if (!result.kind) return;
    const [mx, my] = modelXY();
    const ok = result.kind === "ok";
    const col = ok ? COLOR.verified : COLOR.action;
    ctx.font = `600 12.5px ${SANS}`;
    const tw = ctx.measureText(result.text).width;
    const w = tw + 34;
    const h = 28;
    const x = clamp(mx - w / 2, 6, size.w - w - 6);
    const y = my - Math.max(58, size.h * 0.13) / 2 - 48;
    ctx.save();
    ctx.shadowColor = hexA(col, 0.25);
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = hexA(col, 0.1);
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 14);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // a check for the fit, a small dot for a miss
    ctx.fillStyle = col;
    if (ok) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 11, y + h / 2);
      ctx.lineTo(x + 15, y + h / 2 + 4);
      ctx.lineTo(x + 21, y + h / 2 - 4);
      ctx.stroke();
      ctx.lineCap = "butt";
    } else {
      circle(ctx, x + 15, y + h / 2, 4);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(result.text, x + 27, y + h / 2 + 0.5);
    ctx.textBaseline = "alphabetic";

    // a miss gets a gentle nudge toward the tool that fits, never a dead end
    if (result.hint) {
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 11.5px ${SANS}`;
      ctx.textAlign = "center";
      const hw = ctx.measureText(result.hint).width / 2;
      const hx = clamp(mx, hw + 6, size.w - hw - 6);
      ctx.fillText(result.hint, hx, y - 9);
    }
  }

  function drawToken() {
    if (cur <= 0.001 || cur >= 1.999) return;
    const [x, y] = tokenXY(cur);
    const outbound = cur <= 1;
    const col = outbound ? COLOR.action : COLOR.context;
    glow(ctx, x, y, 20, col, 0.5);
    ctx.save();
    ctx.shadowColor = hexA(col, 0.7);
    ctx.shadowBlur = 10;
    circle(ctx, x, y, 6);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    circle(ctx, x, y, 6);
    ctx.fillStyle = hexA(col, 0.92);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    drawGround();
    drawArcs();
    drawModel();
    drawToolbox();
    drawResult();
    drawToken();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    const dir = Math.sign(target - cur);
    if (dir !== 0) {
      const step = SPEED * dt;
      cur = Math.abs(target - cur) <= step ? target : cur + step * dir;
    }
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);
  else render();

  // a scroll-jitter re-fire of the same scene must not reset a finished pick
  let curScene = "";
  function setScene(id: string) {
    if (running) return;
    if (id === curScene) return;
    curScene = id;
    result = { kind: null, text: "", hint: "" };
    modelActive = false;
    selectedId = null;
    toolboxAlpha = 1;
    if (id === "intro") {
      phase = "idle";
      target = 0;
      modelActive = true;
      toolboxAlpha = 0.4;
    } else if (id === "offer") {
      phase = "idle";
      target = 0;
      cur = 0;
    } else if (id === "pick") {
      phase = "call";
      target = 1;
      selectedId = "read";
    } else if (id === "run") {
      phase = "run";
      target = 1;
      selectedId = "read";
    } else if (id === "result") {
      phase = "result";
      target = 2;
      selectedId = "read";
      result = { kind: "ok", text: "Returned the file's text", hint: "" };
    } else if (id === "decide") {
      phase = "result";
      target = 2;
      selectedId = "read";
      modelActive = true;
      result = { kind: "ok", text: "Returned the file's text", hint: "" };
    } else if (id === "try") {
      phase = "idle";
      target = 0;
      cur = 0;
    }
    if (reduce) render();
  }

  observeScenes(setScene);

  // ---- interactive: pick the tool --------------------------------------
  let running = false;
  function runPick(tool: (typeof TOOLS)[number]) {
    running = true;
    selectedId = tool.id;
    result = { kind: null, text: "", hint: "" };
    modelActive = false;
    toolboxAlpha = 1;
    cur = 0;
    phase = "call";
    const settle = () => {
      modelActive = true;
      phase = "result";
      result = tool.fit
        ? { kind: "ok", text: tool.text, hint: "" }
        : { kind: "miss", text: tool.text, hint: HINT };
      running = false;
    };
    if (reduce) {
      cur = 2;
      settle();
      render();
      return;
    }
    target = 1;
    const toHarness = setInterval(() => {
      if (cur < 0.999) return;
      clearInterval(toHarness);
      phase = "run";
      setTimeout(() => {
        phase = "result";
        target = 2;
        const back = setInterval(() => {
          if (cur < 1.999) return;
          clearInterval(back);
          settle();
        }, 40);
      }, 650);
    }, 40);
  }

  const btns = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-tool]"),
  );
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-tool");
      const tool = TOOLS.find((t) => t.id === id);
      if (!tool) return;
      btns.forEach((o) =>
        o.setAttribute("aria-pressed", o === b ? "true" : "false"),
      );
      runPick(tool);
    });
  });
}
