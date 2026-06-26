// The plan system — canvas controller. A plan forms as a checklist, waits for
// approval (it changes nothing until you say go), then fills in step by step as
// the loop works through it. The reader can approve as-is or edit a step first.
// Built on ./kit.

import {
  COLOR,
  circle,
  glow,
  hexA,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  SANS,
  MONO,
} from "./kit";

type RowState = "pending" | "active" | "done";
interface Row {
  label: string;
  risk?: boolean;
  state: RowState;
}

const BASE: () => Row[] = () => [
  { label: "Add a toggle button", state: "pending" },
  { label: "Save the choice", state: "pending" },
  { label: "Apply the dark style", state: "pending", risk: true },
  { label: "Check it works", state: "pending" },
];

export function initPlanning(): void {
  const s = makeSurface("pl-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let rows = BASE();
  let approved = false;
  let waiting = false; // show the "waiting for approval" badge
  let title = "Add a dark mode toggle";
  let running = false;

  function panel() {
    const w = Math.min(size.w - 40, 420);
    const x = (size.w - w) / 2;
    const rowH = 46;
    const headH = 64;
    const h = headH + rows.length * rowH + 20;
    const y = (size.h - h) / 2;
    return { x, y, w, h, rowH, headH };
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    const { x, y, w, h, rowH, headH } = panel();

    // card
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 16);
    ctx.strokeStyle = COLOR.hairStrong;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // header
    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11.5px ${MONO}`;
    ctx.fillText("PLAN", x + 22, y + 26);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `650 17px ${SANS}`;
    ctx.fillText(title, x + 22, y + 48);
    // divider
    ctx.strokeStyle = COLOR.hair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + headH);
    ctx.lineTo(x + w - 18, y + headH);
    ctx.stroke();

    // rows
    rows.forEach((r, i) => {
      const ry = y + headH + 12 + i * rowH + rowH / 2;
      const cx = x + 36;
      const cr = 11;
      // checkbox
      if (r.state === "active") glow(ctx, cx, ry, cr * 2.4, COLOR.action, 0.26);
      circle(ctx, cx, ry, cr);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      let ring = COLOR.hairStrong;
      let rw = 1.6;
      if (r.state === "active") {
        ring = COLOR.action;
        rw = 2.4;
      } else if (r.state === "done") {
        ring = COLOR.verified;
        rw = 2.2;
      }
      circle(ctx, cx, ry, cr);
      ctx.strokeStyle = ring;
      ctx.lineWidth = rw;
      ctx.stroke();
      if (r.state === "done") {
        ctx.strokeStyle = COLOR.verified;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 4.5, ry);
        ctx.lineTo(cx - 1, ry + 4);
        ctx.lineTo(cx + 5, ry - 4.5);
        ctx.stroke();
      }
      // label
      ctx.textAlign = "left";
      ctx.fillStyle =
        r.state === "done"
          ? COLOR.inkSoft
          : r.state === "active"
            ? COLOR.ink
            : COLOR.inkSoft;
      ctx.font = `${r.state === "active" ? "650" : "500"} 15px ${SANS}`;
      ctx.fillText(r.label, cx + 24, ry + 5.5);
      // risk flag
      if (r.risk) {
        const fx = x + w - 78;
        roundRect(ctx, fx, ry - 10, 64, 20, 10);
        ctx.fillStyle = hexA(COLOR.action, 0.12);
        ctx.fill();
        ctx.fillStyle = COLOR.action;
        ctx.font = `600 10.5px ${MONO}`;
        ctx.textAlign = "center";
        ctx.fillText("RISKY", fx + 32, ry + 4);
      }
    });

    // approval badge
    if (waiting && !approved) {
      const bx = x + w / 2;
      const by = y + h + 26;
      const label = "waiting for your approval";
      ctx.font = `600 12.5px ${MONO}`;
      const tw = ctx.measureText(label).width;
      const bw = tw + 30;
      roundRect(ctx, bx - bw / 2, by - 15, bw, 30, 15);
      ctx.fillStyle = hexA(COLOR.context, 0.1);
      ctx.fill();
      ctx.strokeStyle = COLOR.context;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = COLOR.context;
      ctx.textAlign = "center";
      ctx.fillText(label, bx, by + 4);
    } else if (approved && rows.every((r) => r.state === "done")) {
      const bx = x + w / 2;
      const by = y + h + 26;
      const label = "done — every step checked off";
      ctx.font = `600 12.5px ${MONO}`;
      const tw = ctx.measureText(label).width;
      const bw = tw + 30;
      roundRect(ctx, bx - bw / 2, by - 15, bw, 30, 15);
      ctx.fillStyle = hexA(COLOR.verified, 0.1);
      ctx.fill();
      ctx.strokeStyle = COLOR.verified;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = COLOR.verified;
      ctx.textAlign = "center";
      ctx.fillText(label, bx, by + 4);
    }
  }

  // animation loop (only a gentle redraw for the active glow pulse)
  let raf = 0;
  function frame() {
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);
  else render();

  function resetRows() {
    rows = BASE();
  }

  // walk the checklist: each row active then done
  let timers: number[] = [];
  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }
  function runChecklist(done?: () => void) {
    let i = 0;
    const step = () => {
      if (i > 0) rows[i - 1].state = "done";
      if (i >= rows.length) {
        running = false;
        done?.();
        return;
      }
      rows[i].state = "active";
      i++;
      timers.push(window.setTimeout(step, 720));
    };
    step();
  }

  // a scroll-jitter re-fire of the same scene must not restart a finished run;
  // ignore a repeat of the active scene, only a real change re-runs it.
  let curScene = "";
  function setScene(id: string) {
    if (running) return;
    if (id === curScene) return;
    curScene = id;
    clearTimers();
    if (id === "intro") {
      resetRows();
      approved = false;
      waiting = false;
      title = "Add a dark mode toggle";
    } else if (id === "propose") {
      resetRows();
      approved = false;
      waiting = true;
    } else if (id === "approve") {
      resetRows();
      approved = false;
      waiting = true;
    } else if (id === "work") {
      resetRows();
      approved = true;
      waiting = false;
      running = true;
      runChecklist();
    } else if (id === "track") {
      // show a finished checklist
      resetRows();
      approved = true;
      waiting = false;
      rows.forEach((r) => (r.state = "done"));
    } else if (id === "try") {
      resetRows();
      approved = false;
      waiting = true;
    }
    if (reduce) render();
  }

  observeScenes(setScene);

  // ---- interactive ------------------------------------------------------
  const approveBtn = document.getElementById("pl-approve");
  const editBtn = document.getElementById("pl-edit");
  approveBtn?.addEventListener("click", () => {
    if (running) return;
    clearTimers();
    resetRows();
    approved = true;
    waiting = false;
    running = true;
    if (reduce) {
      rows.forEach((r) => (r.state = "done"));
      running = false;
      render();
      return;
    }
    runChecklist();
  });
  editBtn?.addEventListener("click", () => {
    if (running) return;
    clearTimers();
    resetRows();
    rows[1].label = "Save the choice in the browser";
    approved = true;
    waiting = false;
    running = true;
    if (reduce) {
      rows.forEach((r) => (r.state = "done"));
      running = false;
      render();
      return;
    }
    runChecklist();
  });
}
