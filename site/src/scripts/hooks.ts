// Hooks — canvas controller. The six lifecycle moments sit as stations around
// the loop. A token orbits through them, so the reader sees they happen every
// session, in order. Clicking a moment parks the token there and shows what a
// hook at that moment can do. Built on ./kit.

import {
  COLOR,
  circle,
  clamp,
  glow,
  hexA,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  SANS,
  MONO,
} from "./kit";

interface Moment {
  id: string;
  label: string;
  when: string;
  example: string;
}

const MOMENTS: Moment[] = [
  {
    id: "start",
    label: "SessionStart",
    when: "a session begins",
    example: "Load a short summary of the project.",
  },
  {
    id: "prompt",
    label: "UserPromptSubmit",
    when: "you send a prompt",
    example: "Add notes saved from earlier sessions.",
  },
  {
    id: "pretool",
    label: "PreToolUse",
    when: "a tool is about to run",
    example: "Check the action before it runs.",
  },
  {
    id: "posttool",
    label: "PostToolUse",
    when: "a tool just ran",
    example: "Format the file and log the change.",
  },
  {
    id: "precompact",
    label: "PreCompact",
    when: "the window is about to compact",
    example: "Save a summary to disk first.",
  },
  {
    id: "stop",
    label: "Stop",
    when: "the turn is about to end",
    example: "Run a final check before finishing.",
  },
];

export function initHooks(): void {
  const s = makeSurface("hk-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let selected: string | null = null;
  let orbit = true; // token freely circles
  let tokenA = -Math.PI / 2; // current token angle
  let targetIdx: number | null = null; // park target

  // a horizontal ellipse: side stations sit closer to center so their long
  // labels have room before the canvas edge, while vertical spread stays open.
  function geom() {
    const cx = size.w / 2;
    const cy = size.h * 0.47;
    const m = Math.min(size.w, size.h);
    const rx = m * 0.26;
    const ry = m * 0.34;
    return { cx, cy, rx, ry };
  }
  function stationAngle(i: number): number {
    return -Math.PI / 2 + (i / MOMENTS.length) * Math.PI * 2;
  }
  function stationXY(i: number): [number, number] {
    const { cx, cy, rx, ry } = geom();
    const a = stationAngle(i);
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  }

  function drawRing() {
    const { cx, cy, rx, ry } = geom();
    ctx.strokeStyle = COLOR.hair;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawStation(i: number) {
    const m = MOMENTS[i];
    const [x, y] = stationXY(i);
    const hot = selected === m.id;
    const nr = 9;
    if (hot) glow(ctx, x, y, nr * 3, COLOR.action, 0.3);
    circle(ctx, x, y, nr);
    ctx.fillStyle = hot ? COLOR.action : COLOR.white;
    ctx.fill();
    circle(ctx, x, y, nr);
    ctx.strokeStyle = hot ? COLOR.action : COLOR.hairStrong;
    ctx.lineWidth = hot ? 2.4 : 1.6;
    ctx.stroke();

    // label outside the ring, clamped to stay inside the canvas
    const { cx, cy } = geom();
    const ax = x - cx;
    const ay = y - cy;
    const len = Math.hypot(ax, ay) || 1;
    let lx = x + (ax / len) * 18;
    const ly = y + (ay / len) * 18;
    ctx.font = `${hot ? "650" : "550"} 12px ${MONO}`;
    ctx.fillStyle = hot ? COLOR.action : COLOR.inkSoft;
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(m.label).width;
    const pad = 6;
    if (Math.abs(ax) < 8) {
      ctx.textAlign = "center";
      lx = clamp(lx, pad + tw / 2, size.w - pad - tw / 2);
    } else if (ax > 0) {
      ctx.textAlign = "left";
      if (lx + tw > size.w - pad) lx = size.w - pad - tw;
    } else {
      ctx.textAlign = "right";
      if (lx - tw < pad) lx = pad + tw;
    }
    ctx.fillText(m.label, lx, ly);
    ctx.textBaseline = "alphabetic";
  }

  function drawCenter() {
    const { cx, cy } = geom();
    const m = selected ? MOMENTS.find((x) => x.id === selected) : null;
    ctx.textAlign = "center";
    if (!m) {
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 13px ${SANS}`;
      ctx.fillText("Every session runs", cx, cy - 8);
      ctx.fillText("through these six moments.", cx, cy + 12);
      return;
    }
    // a small card in the center
    const w = Math.min(size.w * 0.5, 240);
    const h = 96;
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.1)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 14);
    ctx.strokeStyle = hexA(COLOR.action, 0.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = COLOR.action;
    ctx.font = `650 14px ${MONO}`;
    ctx.fillText(m.label, cx, y + 24);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11.5px ${SANS}`;
    ctx.fillText(`fires when ${m.when}`, cx, y + 44);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `550 13px ${SANS}`;
    wrap(m.example, cx, y + 66, w - 28, 17);
  }

  function wrap(text: string, cx: number, y: number, maxW: number, lh: number) {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
  }

  function drawToken() {
    const { cx, cy, rx, ry } = geom();
    const x = cx + Math.cos(tokenA) * rx;
    const y = cy + Math.sin(tokenA) * ry;
    glow(ctx, x, y, 18, COLOR.action, 0.5);
    ctx.save();
    ctx.shadowColor = hexA(COLOR.action, 0.7);
    ctx.shadowBlur = 10;
    circle(ctx, x, y, 6);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    circle(ctx, x, y, 6);
    ctx.fillStyle = hexA(COLOR.action, 0.92);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    drawRing();
    MOMENTS.forEach((_, i) => drawStation(i));
    drawCenter();
    drawToken();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (targetIdx !== null) {
      // ease tokenA toward the target station's angle (shortest way)
      const ta = stationAngle(targetIdx);
      let d = ta - tokenA;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      tokenA += d * Math.min(1, dt * 6);
    } else if (orbit) {
      tokenA += dt * 0.9;
    }
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);
  else render();

  function pick(idx: number | null) {
    if (idx === null) {
      selected = null;
      targetIdx = null;
      orbit = true;
    } else {
      selected = MOMENTS[idx].id;
      targetIdx = idx;
      orbit = false;
    }
    if (reduce) {
      if (idx !== null) tokenA = stationAngle(idx);
      render();
    }
  }

  // Once the reader picks a moment on the "try" scene, a re-intersection of the
  // same scene must not reset their choice. Track the active scene and ignore a
  // repeat of it; only a real scene change re-runs the directive.
  let curScene = "";
  function setScene(id: string) {
    if (id === curScene) return;
    curScene = id;
    if (id === "intro" || id === "moments") {
      pick(null);
    } else if (id === "run") {
      pick(2); // PreToolUse: check an action before it runs
    } else if (id === "addstop") {
      pick(3); // PostToolUse: format + log
    } else if (id === "try") {
      pick(null);
    }
  }

  observeScenes(setScene);

  // ---- interactive ------------------------------------------------------
  const btns = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-moment]"),
  );
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-moment");
      const idx = MOMENTS.findIndex((m) => m.id === id);
      if (idx < 0) return;
      btns.forEach((o) =>
        o.setAttribute("aria-pressed", o === b ? "true" : "false"),
      );
      pick(idx);
    });
  });
}
