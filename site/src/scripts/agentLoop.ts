// The agent loop — canvas controller. Claude Code runs the model in a repeating
// cycle: Read, Plan, Act, Check, and around again until the job is done. Two of
// those stages touch your computer and so are tool calls the harness runs (Read,
// Act); the other two are the model thinking (Plan, Check). The reader scrolls
// through the cycle, then can step it themselves on a small real task. On ./kit.

import {
  COLOR,
  SANS,
  MONO,
  makeSurface,
  observeScenes,
  prefersReducedMotion,
  circle,
  roundRect,
  glow,
  hexA,
} from "./kit";

interface Stage {
  id: string;
  label: string;
  accent: string;
  activity: string;
  tool: string | null; // the tool the harness runs, or null when the model just thinks
}

const STAGES: Stage[] = [
  {
    id: "read",
    label: "Read",
    accent: COLOR.context,
    activity: "Open the files to see how the page is built.",
    tool: "Read index.html",
  },
  {
    id: "plan",
    label: "Plan",
    accent: COLOR.purple,
    activity: "Break the goal into a short list of steps.",
    tool: null,
  },
  {
    id: "act",
    label: "Act",
    accent: COLOR.action,
    activity: "Make one change to a file.",
    tool: "Edit index.html",
  },
  {
    id: "check",
    label: "Check",
    accent: COLOR.verified,
    activity: "Look at the result. Done, or go again?",
    tool: null,
  },
];

// node angles: Read top, Plan right, Act bottom, Check left (clockwise)
const ANG = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
const TASK = "Add a dark-mode button";

export function initAgentLoop(): void {
  const s = makeSurface("al-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let activeIdx: number | null = null;
  let doneCount = 0; // stages finished in the current pass
  let pass = 1;
  let ringOn = false;
  let centerMsg: string[] | null = null;
  let mode: "scroll" | "play" = "scroll";
  let stepsDone = 0; // play: plan steps completed (0..3)
  let finished = false;

  let curProg = 0; // token position, continuous
  let targetProg = 0;

  function geom() {
    const cx = size.w / 2;
    // R is bounded so the side nodes clear the edges and the top/bottom nodes
    // leave room for the header above and labels below; cy drops the ring
    // enough that the top node never collides with the TASK header on short
    // (mobile) canvases.
    const R = Math.min(size.w * 0.5 - 30, (size.h - 130) / 2, 168);
    const cy = Math.max(size.h * 0.5, R + 96);
    return { cx, cy, R };
  }
  function nodeXY(i: number): [number, number] {
    const { cx, cy, R } = geom();
    return [cx + Math.cos(ANG[i]) * R, cy + Math.sin(ANG[i]) * R];
  }

  function drawHeader() {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `600 10px ${MONO}`;
    ctx.fillText("TASK", 22, 26);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(TASK, 22, 44);

    // right side: pass / progress, only once the loop is running
    if (ringOn && (activeIdx !== null || mode === "play")) {
      const right = size.w - 22;
      ctx.textAlign = "right";
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `600 10px ${MONO}`;
      ctx.fillText("PASS", right, 26);
      ctx.fillStyle = COLOR.ink;
      ctx.font = `600 13px ${SANS}`;
      const label = mode === "play" ? `${pass} · ${stepsDone}/3` : `${pass}`;
      ctx.fillText(label, right, 44);
    }
  }

  function drawRing() {
    const { cx, cy, R } = geom();
    ctx.strokeStyle = ringOn ? COLOR.hairStrong : COLOR.hair;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(ringOn ? [] : [4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!ringOn) return;
    // four clockwise arrowheads at the mid-angles between nodes
    for (let i = 0; i < 4; i++) {
      const a = ANG[i] + Math.PI / 4; // midpoint toward the next node
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const t = a + Math.PI / 2; // tangent, clockwise
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-7, -4);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fillStyle = COLOR.hairStrong;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawNode(i: number) {
    const [x, y] = nodeXY(i);
    const st = STAGES[i];
    const active = i === activeIdx;
    const done = i < doneCount && i !== activeIdx;
    const r = 22;

    if (active) glow(ctx, x, y, r * 2.4, st.accent, 0.26);
    circle(ctx, x, y, r);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    circle(ctx, x, y, r);
    ctx.strokeStyle = active
      ? st.accent
      : done
        ? COLOR.verified
        : COLOR.hairStrong;
    ctx.lineWidth = active ? 2.5 : done ? 2 : 1.5;
    ctx.stroke();

    // inside glyph: check when done, accent dot when active
    if (done) {
      ctx.strokeStyle = COLOR.verified;
      ctx.lineWidth = 2.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x - 1, y + 4.5);
      ctx.lineTo(x + 6, y - 5);
      ctx.stroke();
      ctx.lineCap = "butt";
    } else if (active) {
      circle(ctx, x, y, 4.5);
      ctx.fillStyle = st.accent;
      ctx.fill();
    }

    // label: Read/Plan/Check sit above their node, Act below — all centered on
    // the node's x, so a long word (Check) on the left never runs off the edge.
    const ly = i === 2 ? y + (r + 17) : y - (r + 15);
    ctx.fillStyle = active ? st.accent : done ? COLOR.inkSoft : COLOR.inkFaint;
    ctx.font = `${active ? "650" : "550"} 13px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.label, x, ly);
    ctx.textBaseline = "alphabetic";
  }

  function drawToken() {
    const { cx, cy, R } = geom();
    const a = -Math.PI / 2 + (curProg % 4) * (Math.PI / 2);
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const col = activeIdx !== null ? STAGES[activeIdx].accent : COLOR.inkFaint;
    glow(ctx, x, y, 16, col, 0.5);
    circle(ctx, x, y, 5.5);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    circle(ctx, x, y, 5.5);
    ctx.fillStyle = hexA(col, 0.92);
    ctx.fill();
  }

  function drawCenter() {
    const { cx, cy } = geom();
    ctx.textAlign = "center";
    if (centerMsg) {
      ctx.fillStyle = COLOR.inkSoft;
      ctx.font = `500 15px ${SANS}`;
      const y0 = cy - ((centerMsg.length - 1) * 22) / 2;
      centerMsg.forEach((l, i) => ctx.fillText(l, cx, y0 + i * 22));
      return;
    }
    if (activeIdx === null) return;
    const st = STAGES[activeIdx];
    ctx.fillStyle = st.accent;
    ctx.font = `650 17px ${SANS}`;
    ctx.fillText(st.label, cx, cy - 26);
    ctx.fillStyle = COLOR.ink;
    ctx.font = `500 12.5px ${SANS}`;
    wrap(st.activity, cx, cy - 4, 168, 16);

    // tool chip (Read / Act) or a "thinking" pill (Plan / Check)
    const cy2 = cy + 34;
    if (st.tool) {
      const text = `harness runs: ${st.tool}`;
      ctx.font = `600 11.5px ${MONO}`;
      const w = ctx.measureText(text).width + 26;
      const x = cx - w / 2;
      roundRect(ctx, x, cy2 - 12, w, 24, 12);
      ctx.fillStyle = hexA(st.accent, 0.12);
      ctx.fill();
      roundRect(ctx, x, cy2 - 12, w, 24, 12);
      ctx.strokeStyle = hexA(st.accent, 0.55);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = st.accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cx, cy2);
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 11.5px ${MONO}`;
      ctx.textAlign = "center";
      ctx.fillText("the model thinking — no tool", cx, cy2 + 3);
    }
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
    const y0 = y - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    drawHeader();
    drawRing();
    if (ringOn) STAGES.forEach((_, i) => drawNode(i));
    if (ringOn) drawToken();
    drawCenter();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    curProg += (targetProg - curProg) * Math.min(1, dt * 5);
    if (Math.abs(targetProg - curProg) < 0.001) curProg = targetProg;
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);

  // ---- scroll-driven scenes --------------------------------------------
  let cur = "";
  function setScene(id: string) {
    if (id === cur) return;
    cur = id;
    mode = "scroll";
    finished = false;
    stepsDone = 0;
    pass = 1;
    if (id === "intro") {
      ringOn = false;
      activeIdx = null;
      doneCount = 0;
      centerMsg = ["On its own, a model", "can only write text."];
    } else if (id === "harness") {
      ringOn = false;
      activeIdx = null;
      doneCount = 0;
      centerMsg = ["The harness runs the tools", "and hands back the result."];
    } else if (id === "loop") {
      ringOn = true;
      activeIdx = null;
      doneCount = 0;
      centerMsg = ["Read, Plan, Act, Check —", "then around again."];
      targetProg = 0;
    } else if (id === "read") {
      ringOn = true;
      activeIdx = 0;
      doneCount = 0;
      centerMsg = null;
      targetProg = 0;
    } else if (id === "plan") {
      ringOn = true;
      activeIdx = 1;
      doneCount = 1;
      centerMsg = null;
      targetProg = 1;
    } else if (id === "act") {
      ringOn = true;
      activeIdx = 2;
      doneCount = 2;
      centerMsg = null;
      targetProg = 2;
    } else if (id === "check") {
      ringOn = true;
      activeIdx = 3;
      doneCount = 3;
      centerMsg = null;
      targetProg = 3;
    } else if (id === "play") {
      mode = "play";
      ringOn = true;
      activeIdx = null;
      doneCount = 0;
      stepsDone = 0;
      finished = false;
      centerMsg = ["Press Step to run", "the loop yourself."];
      targetProg = 0;
      curProg = 0;
    }
    if (reduce) {
      curProg = targetProg;
      render();
    }
  }

  observeScenes(setScene);
  if (reduce) render();

  // ---- play: step the loop yourself ------------------------------------
  function step() {
    if (mode !== "play" || finished) return;
    centerMsg = null;
    if (activeIdx === null) {
      activeIdx = 0;
      doneCount = 0;
    } else if (activeIdx < 3) {
      activeIdx++;
      doneCount = activeIdx;
      targetProg += 1;
    } else {
      // finished a Check: one plan step is now done
      stepsDone = Math.min(3, stepsDone + 1);
      if (stepsDone >= 3) {
        finished = true;
        activeIdx = null;
        doneCount = 4;
        centerMsg = ["Done.", "The button works."];
      } else {
        pass++;
        activeIdx = 0;
        doneCount = 0;
        targetProg += 1; // continue clockwise into the next Read
      }
    }
    if (reduce) {
      curProg = targetProg;
      render();
    }
  }

  function resetPlay() {
    mode = "play";
    finished = false;
    activeIdx = null;
    doneCount = 0;
    pass = 1;
    stepsDone = 0;
    curProg = 0;
    targetProg = 0;
    centerMsg = ["Press Step to run", "the loop yourself."];
    if (reduce) render();
  }

  const stepBtn = document.getElementById("al-step");
  const resetBtn = document.getElementById("al-reset");
  stepBtn?.addEventListener("click", step);
  resetBtn?.addEventListener("click", resetPlay);
}
