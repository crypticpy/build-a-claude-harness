// Tool calls — canvas controller. One round trip: the model asks for a tool,
// the harness runs it on "your computer," the result comes back as context.
// Scroll drives the scenes; the last scene lets the reader pick the tool and
// watch the round trip succeed or come back empty. Built on ./kit.

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

type Phase = "idle" | "ask" | "run" | "result";
interface Result {
  kind: "ok" | "empty" | null;
  text: string;
}

// The four tools the reader can pick in the interactive. `good` = the right
// one for "what's in README.md".
const TOOLS = [
  {
    id: "read",
    label: "Read file",
    good: true,
    ok: "Returned the file's text",
    empty: "",
  },
  {
    id: "bash",
    label: "Run command",
    good: false,
    ok: "",
    empty: "Ran, but read nothing back",
  },
  {
    id: "edit",
    label: "Edit file",
    good: false,
    ok: "",
    empty: "Changed a file, learned nothing",
  },
  {
    id: "grep",
    label: "Search code",
    good: false,
    ok: "",
    empty: "Found names, not the contents",
  },
];

export function initToolCalls(): void {
  const s = makeSurface("tc-canvas");
  if (!s) return;
  const { ctx, size } = s;

  // resting state
  let phase: Phase = "idle";
  let toolLabel = "Tool";
  let result: Result = { kind: null, text: "" };
  let modelActive = false;

  // token progress along the round trip: 0..1 ask (model->tool),
  // 1..2 result (tool->model). Eased toward target.
  let cur = 0;
  let target = 0;
  const SPEED = 1.8; // units/sec

  const reduce = prefersReducedMotion();

  function modelXY(): [number, number] {
    return [size.w * 0.2, size.h * 0.4];
  }
  function toolXY(): [number, number] {
    return [size.w * 0.8, size.h * 0.4];
  }

  // token position from progress
  function tokenXY(p: number): [number, number] {
    const [mx, my] = modelXY();
    const [tx, ty] = toolXY();
    if (p <= 1) {
      const f = ease(clamp(p, 0, 1));
      return [lerp(mx, tx, f), lerp(my, ty, f) - bow(f)];
    }
    const f = ease(clamp(p - 1, 0, 1));
    return [lerp(tx, mx, f), lerp(ty, my, f) + bow(f)];
  }
  // a gentle arc so out and back don't overlap
  function bow(f: number): number {
    return Math.sin(f * Math.PI) * (size.h * 0.12);
  }

  function drawGround() {
    const [tx] = toolXY();
    const y = size.h * 0.4 + Math.max(34, size.w * 0.05) + 30;
    ctx.strokeStyle = COLOR.hairStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx - size.w * 0.22, y);
    ctx.lineTo(tx + size.w * 0.16, y);
    ctx.stroke();
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11.5px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText("YOUR COMPUTER", tx - size.w * 0.03, y + 16);
    // little tie from tool down to the ground
    const [, ty] = toolXY();
    const r = Math.max(34, size.w * 0.05);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = COLOR.hair;
    ctx.beginPath();
    ctx.moveTo(tx, ty + r);
    ctx.lineTo(tx, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBox(
    cx: number,
    cy: number,
    title: string,
    sub: string,
    active: boolean,
    accent: string,
  ) {
    const w = Math.max(118, size.w * 0.2);
    const h = Math.max(58, size.h * 0.13);
    const x = cx - w / 2;
    const y = cy - h / 2;
    if (active) glow(ctx, cx, cy, w * 0.9, accent, 0.22);
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 14);
    ctx.strokeStyle = active ? accent : COLOR.hairStrong;
    ctx.lineWidth = active ? 2.2 : 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = active ? accent : COLOR.ink;
    ctx.font = `650 15px ${SANS}`;
    ctx.fillText(title, cx, cy - 2);
    ctx.fillStyle = COLOR.inkSoft;
    ctx.font = `500 12px ${SANS}`;
    ctx.fillText(sub, cx, cy + 16);
  }

  function drawToolNode(active: boolean) {
    const [cx, cy] = toolXY();
    const r = Math.max(34, size.w * 0.05);
    if (active) glow(ctx, cx, cy, r * 2, COLOR.verified, 0.22);
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    circle(ctx, cx, cy, r);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    circle(ctx, cx, cy, r);
    ctx.strokeStyle = active ? COLOR.verified : COLOR.hairStrong;
    ctx.lineWidth = active ? 2.4 : 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = active ? COLOR.verified : COLOR.ink;
    ctx.font = `650 13px ${SANS}`;
    ctx.fillText(toolLabel, cx, cy - 2);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 10.5px ${MONO}`;
    ctx.fillText("tool", cx, cy + 14);
  }

  function drawArcs() {
    const [mx, my] = modelXY();
    const [tx, ty] = toolXY();
    const r = Math.max(34, size.w * 0.05);
    const bw = Math.max(118, size.w * 0.2) / 2;
    // request arc (top, amber) and result arc (bottom, blue), faint baselines
    ctx.globalAlpha = 0.5;
    arrow(ctx, mx + bw + 4, my - 22, tx - r - 6, ty - 22, COLOR.hair, 1.5);
    arrow(ctx, tx - r - 6, ty + 22, mx + bw + 4, my + 22, COLOR.hair, 1.5);
    ctx.globalAlpha = 1;
    // labels
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11.5px ${MONO}`;
    ctx.textAlign = "center";
    const midx = (mx + tx) / 2;
    ctx.fillText("asks for a tool", midx, my - 30);
    ctx.fillText("result comes back", midx, my + 40);
  }

  function drawResult() {
    if (!result.kind) return;
    const [mx, my] = modelXY();
    const ok = result.kind === "ok";
    const col = ok ? COLOR.verified : COLOR.risk;
    ctx.font = `600 12.5px ${SANS}`;
    const tw = ctx.measureText(result.text).width;
    const w = tw + 34;
    const h = 28;
    const x = clamp(mx - w / 2, 6, size.w - w - 6);
    const y = my - Math.max(58, size.h * 0.13) / 2 - 46;
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
    ctx.fillStyle = col;
    circle(ctx, x + 15, y + h / 2, 4);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(result.text, x + 27, y + h / 2 + 0.5);
    ctx.textBaseline = "alphabetic";
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
    const [mx, my] = modelXY();
    const [tx, ty] = toolXY();
    drawBox(mx, my, "Model", "writes text", modelActive, COLOR.context);
    drawToolNode(phase === "run");
    drawResult();
    drawToken();
  }

  let last = performance.now();
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
  let raf = 0;
  if (!reduce) raf = requestAnimationFrame(frame);
  else render();

  function setScene(id: string) {
    if (running) return;
    result = { kind: null, text: "" };
    modelActive = false;
    toolLabel = "Tool";
    if (id === "intro") {
      phase = "idle";
      target = 0;
      modelActive = true;
    } else if (id === "ask") {
      phase = "ask";
      target = 1;
      toolLabel = "Read file";
    } else if (id === "run") {
      phase = "run";
      target = 1;
      toolLabel = "Read file";
    } else if (id === "result") {
      phase = "result";
      target = 2;
      toolLabel = "Read file";
      result = { kind: "ok", text: "Returned the file's text" };
    } else if (id === "decide") {
      phase = "result";
      target = 2;
      toolLabel = "Read file";
      modelActive = true;
      result = { kind: "ok", text: "Returned the file's text" };
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
    toolLabel = tool.label;
    result = { kind: null, text: "" };
    modelActive = false;
    cur = 0;
    phase = "ask";
    if (reduce) {
      // jump to the end state
      cur = 2;
      phase = "result";
      modelActive = true;
      result = tool.good
        ? { kind: "ok", text: tool.ok }
        : { kind: "empty", text: tool.empty };
      render();
      running = false;
      return;
    }
    // animate: ask (cur->1), run hold, result (cur->2)
    target = 1;
    const watchToTool = setInterval(() => {
      if (cur >= 0.999) {
        clearInterval(watchToTool);
        phase = "run";
        setTimeout(() => {
          phase = "result";
          target = 2;
          const watchBack = setInterval(() => {
            if (cur >= 1.999) {
              clearInterval(watchBack);
              modelActive = true;
              result = tool.good
                ? { kind: "ok", text: tool.ok }
                : { kind: "empty", text: tool.empty };
              running = false;
            }
          }, 40);
        }, 650);
      }
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
