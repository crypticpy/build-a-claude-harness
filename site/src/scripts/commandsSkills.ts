// Commands and skills — canvas controller. A short name expands into the same
// full set of instructions every time, so you never retype them. The one real
// difference: you call a command by typing its name; the model reaches for a
// skill on its own when the task fits. Built on ./kit.

import {
  COLOR,
  clamp,
  ease,
  glow,
  hexA,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  SANS,
  MONO,
} from "./kit";

interface Item {
  id: string;
  kind: "command" | "skill";
  name: string; // shown on the pill
  task: string; // the plain task it covers
  steps: string[];
}

const ITEMS: Item[] = [
  {
    id: "review",
    kind: "command",
    name: "/review",
    task: "review my code",
    steps: [
      "Look for bugs and risky changes",
      "Check that inputs are validated",
      "List the findings by priority",
    ],
  },
  {
    id: "commit",
    kind: "command",
    name: "/commit",
    task: "write a commit message",
    steps: [
      "Read the staged changes",
      "Sum them up in one line",
      "Add a conventional prefix",
    ],
  },
  {
    id: "pdf",
    kind: "skill",
    name: "PDF forms",
    task: "fill out a PDF form",
    steps: [
      "Find the form's fields",
      "Match them to your data",
      "Write the filled-in file",
    ],
  },
  {
    id: "voice",
    kind: "skill",
    name: "Brand voice",
    task: "match our writing style",
    steps: [
      "Load the saved style notes",
      "Rewrite the draft to match",
      "Keep the wording plain",
    ],
  },
];

export function initCommandsSkills(): void {
  const s = makeSurface("cs-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let selected: string = "review";
  let mode: "single" | "compare" = "single";
  let reveal = 0; // 0..1 how far the steps have expanded in

  function item(id: string): Item {
    return ITEMS.find((x) => x.id === id) || ITEMS[0];
  }

  function pillW(): number {
    return Math.min(size.w * 0.42, 168);
  }

  // a rounded "name" pill: mono for commands, label text for skills
  function drawPill(x: number, y: number, it: Item, hot: boolean) {
    const w = pillW();
    const h = 38;
    const tint = it.kind === "command" ? COLOR.context : COLOR.action;
    if (hot) glow(ctx, x + w / 2, y + h / 2, w * 0.62, tint, 0.14);
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = hot ? hexA(tint, 0.1) : COLOR.white;
    ctx.fill();
    roundRect(ctx, x, y, w, h, 10);
    ctx.strokeStyle = hot ? tint : COLOR.hairStrong;
    ctx.lineWidth = hot ? 2 : 1.4;
    ctx.stroke();
    ctx.fillStyle = hot ? tint : COLOR.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = it.kind === "command" ? `650 15px ${MONO}` : `650 14px ${SANS}`;
    ctx.fillText(it.name, x + 14, y + h / 2);
    ctx.textBaseline = "alphabetic";
    return { w, h };
  }

  // the instructions card on the right: the full steps the name expands to
  function drawSteps(x: number, y: number, w: number, it: Item, r: number) {
    const lh = 30;
    const h = 30 + it.steps.length * lh + 8;
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.08)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 14);
    ctx.strokeStyle = COLOR.hair;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `600 11px ${MONO}`;
    ctx.fillText("THE SAVED STEPS", x + 16, y + 20);

    it.steps.forEach((st, i) => {
      const sy = y + 30 + i * lh + lh / 2;
      // each step fades + slides in as reveal passes its threshold
      const t0 = i / it.steps.length;
      const local = clamp((r - t0) / (1 / it.steps.length), 0, 1);
      if (local <= 0) return;
      const e = ease(local);
      ctx.globalAlpha = e;
      const dx = (1 - e) * 10;
      // number bullet
      const tint = it.kind === "command" ? COLOR.context : COLOR.action;
      ctx.fillStyle = hexA(tint, 0.16);
      roundRect(ctx, x + 16 + dx, sy - 9, 18, 18, 5);
      ctx.fill();
      ctx.fillStyle = tint;
      ctx.font = `650 11px ${MONO}`;
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + 22 + dx, sy + 1);
      ctx.fillStyle = COLOR.ink;
      ctx.font = `500 13.5px ${SANS}`;
      ctx.fillText(st, x + 42 + dx, sy + 1);
      ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = 1;
    });
    return { w, h };
  }

  // a short arrow from x1 to x2 with a colored arrowhead
  function arrowH(x1: number, y: number, x2: number, c: string) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2 - 7, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y);
    ctx.lineTo(x2 - 7, y - 4.5);
    ctx.lineTo(x2 - 7, y + 4.5);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }

  // single-item view: a downward arrow with a side label naming who starts it
  function downArrow(cx: number, y1: number, y2: number, kind: Item["kind"]) {
    const c = kind === "command" ? COLOR.context : COLOR.action;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y1);
    ctx.lineTo(cx, y2 - 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, y2);
    ctx.lineTo(cx - 4.5, y2 - 7);
    ctx.lineTo(cx + 4.5, y2 - 7);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.fillStyle = c;
    ctx.font = `600 11px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      kind === "command" ? "you call it" : "the model calls it",
      cx + 12,
      (y1 + y2) / 2,
    );
    ctx.textBaseline = "alphabetic";
  }

  // compare view: a pill, a short arrow, then the trigger label as the endpoint
  function compareRow(x: number, y: number, it: Item) {
    const p = drawPill(x, y - 19, it, true);
    const c = it.kind === "command" ? COLOR.context : COLOR.action;
    const x1 = x + p.w + 8;
    arrowH(x1, y, x1 + 26, c);
    ctx.fillStyle = c;
    ctx.font = `650 12.5px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const label = it.kind === "command" ? "you call it" : "the model calls it";
    ctx.fillText(label, x1 + 34, y);
    ctx.textBaseline = "alphabetic";
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    const pad = 22;
    const cx = size.w / 2;

    if (mode === "compare") {
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `600 11px ${MONO}`;
      ctx.textAlign = "left";
      ctx.fillText("TWO WAYS IN", pad, 32);
      const cmd = ITEMS.find((i) => i.kind === "command")!;
      const skill = ITEMS.find((i) => i.kind === "skill")!;
      compareRow(pad, size.h * 0.3, cmd);
      compareRow(pad, size.h * 0.5, skill);
      ctx.textAlign = "center";
      ctx.fillStyle = COLOR.ink;
      ctx.font = `600 13.5px ${SANS}`;
      ctx.fillText("Both expand into the same saved steps,", cx, size.h * 0.74);
      ctx.fillStyle = COLOR.inkSoft;
      ctx.font = `500 13px ${SANS}`;
      ctx.fillText("run the same way every time.", cx, size.h * 0.74 + 20);
      return;
    }

    const it = item(selected);
    const cardH = 30 + it.steps.length * 30 + 8;
    const pillX = cx - pillW() / 2;
    // center the whole pill → arrow → card stack vertically
    const pillY = Math.max(24, (size.h - (118 + cardH)) / 2);
    drawPill(pillX, pillY, it, true);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 12px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(`“${it.task}”`, cx, pillY + 58);

    const aBot = pillY + 104;
    downArrow(cx, pillY + 70, aBot, it.kind);

    const cardW = Math.min(size.w - pad * 2, 320);
    drawSteps(cx - cardW / 2, aBot + 14, cardW, it, reveal);
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (reveal < 1) reveal = Math.min(1, reveal + dt * 1.6);
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);

  function show(id: string) {
    selected = id;
    mode = "single";
    reveal = reduce ? 1 : 0;
    if (reduce) render();
  }

  // ignore a scroll-jitter re-fire of the active scene so a pick doesn't reset
  let curScene = "";
  function setScene(sceneId: string) {
    if (sceneId === curScene) return;
    curScene = sceneId;
    if (sceneId === "intro" || sceneId === "command") {
      show("review");
    } else if (sceneId === "skill") {
      show("pdf");
    } else if (sceneId === "trigger") {
      mode = "compare";
      reveal = 1;
      if (reduce) render();
    } else if (sceneId === "try") {
      show("review");
    }
  }

  observeScenes(setScene);
  if (reduce) render();

  // ---- interactive ------------------------------------------------------
  const btns = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-item]"),
  );
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-item");
      if (!id) return;
      btns.forEach((o) =>
        o.setAttribute("aria-pressed", o === b ? "true" : "false"),
      );
      show(id);
    });
  });
}
