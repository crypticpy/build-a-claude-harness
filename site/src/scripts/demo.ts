// The stock demo — capstone. Two pieces. initTrace drives the canvas that shows
// stock Claude Code building a tic-tac-toe game end to end: plan the files,
// write them, run and fix, done. initBoard wires up the real, playable game the
// reader can use at the end — the actual artifact, not a picture of one.

import {
  COLOR,
  hexA,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  circle,
  SANS,
  MONO,
} from "./kit";

const FILES = [
  { name: "index.html", note: "the page" },
  { name: "style.css", note: "the look" },
  { name: "game.js", note: "the logic" },
];

const STATUS: Record<string, string> = {
  intro: "A prompt arrives",
  plan: "Plan the files",
  build: "Write the files",
  check: "Run it, fix what breaks",
  play: "Done",
};

// a small sample board for the canvas preview (an X diagonal)
const SAMPLE = ["X", "O", "", "", "X", "O", "", "", "X"];

export function initDemo(): void {
  initTrace();
  initBoard();
}

function initTrace(): void {
  const s = makeSurface("demo-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let scene = "intro";
  let prog = 0; // 0..3 files written
  let progTarget = 0;
  let fixed = false;

  function statusPill() {
    const text = STATUS[scene] || "";
    ctx.font = `650 12px ${MONO}`;
    const tw = ctx.measureText(text.toUpperCase()).width;
    const w = tw + 28;
    const x = size.w / 2 - w / 2;
    const y = 24;
    const done = scene === "play";
    const c = done ? COLOR.verified : COLOR.action;
    roundRect(ctx, x, y, w, 26, 13);
    ctx.fillStyle = hexA(c, 0.12);
    ctx.fill();
    ctx.fillStyle = c;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.toUpperCase(), size.w / 2, y + 13);
    ctx.textBaseline = "alphabetic";
  }

  function drawFiles() {
    const x = 22;
    let y = 78;
    const done = Math.floor(prog + 0.0001);
    FILES.forEach((f, i) => {
      const writing = i === done && prog < 3 && prog > i && scene === "build";
      const isDone = i < done || prog >= 3;
      const active = isDone || writing;
      // status dot / check
      const cy = y + 13;
      if (isDone) {
        circle(ctx, x + 8, cy, 8);
        ctx.fillStyle = COLOR.verified;
        ctx.fill();
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + 4.5, cy);
        ctx.lineTo(x + 7, cy + 2.5);
        ctx.lineTo(x + 11.5, cy - 3);
        ctx.stroke();
      } else {
        circle(ctx, x + 8, cy, 8);
        ctx.strokeStyle = writing ? COLOR.action : COLOR.hairStrong;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.textAlign = "left";
      ctx.fillStyle = active ? COLOR.ink : COLOR.inkFaint;
      ctx.font = `600 13px ${MONO}`;
      ctx.fillText(f.name, x + 26, cy - 4);
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 11px ${SANS}`;
      ctx.fillText(
        writing ? "writing…" : isDone ? f.note : "to do",
        x + 26,
        cy + 12,
      );
      y += 44;
    });

    // a fix note appears at the run-and-fix step
    if (fixed) {
      ctx.fillStyle = COLOR.verified;
      ctx.font = `600 11.5px ${SANS}`;
      ctx.textAlign = "left";
      ctx.fillText("✓ found a bug, fixed it", x, y + 8);
    }
  }

  function drawPreview() {
    const sz = Math.min(size.w * 0.4, 156);
    const px = size.w - 22 - sz;
    const py = size.h * 0.5 - sz / 2;
    const level = prog >= 3 ? 3 : prog >= 2 ? 2 : prog >= 1 ? 1 : 0;

    // container box once index.html exists
    if (level >= 1) {
      roundRect(ctx, px, py, sz, sz, 12);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      roundRect(ctx, px, py, sz, sz, 12);
      ctx.strokeStyle = COLOR.hairStrong;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else {
      // faint placeholder before any file exists
      ctx.setLineDash([5, 6]);
      roundRect(ctx, px, py, sz, sz, 12);
      ctx.strokeStyle = COLOR.hair;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 12px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillText("the game", px + sz / 2, py + sz / 2);
      return;
    }

    const pad = 16;
    const g = sz - pad * 2;
    const cell = g / 3;
    const gx = px + pad;
    const gy = py + pad;

    // grid lines once style.css exists
    if (level >= 2) {
      ctx.strokeStyle = COLOR.hairStrong;
      ctx.lineWidth = 2;
      for (let k = 1; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(gx + cell * k, gy);
        ctx.lineTo(gx + cell * k, gy + g);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx, gy + cell * k);
        ctx.lineTo(gx + g, gy + cell * k);
        ctx.stroke();
      }
    }

    // marks once game.js exists
    if (level >= 3) {
      SAMPLE.forEach((m, i) => {
        if (!m) return;
        const r = Math.floor(i / 3);
        const c = i % 3;
        const ccx = gx + cell * c + cell / 2;
        const ccy = gy + cell * r + cell / 2;
        const rad = cell * 0.26;
        if (m === "X") {
          ctx.strokeStyle = COLOR.context;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ccx - rad, ccy - rad);
          ctx.lineTo(ccx + rad, ccy + rad);
          ctx.moveTo(ccx + rad, ccy - rad);
          ctx.lineTo(ccx - rad, ccy + rad);
          ctx.stroke();
        } else {
          ctx.strokeStyle = COLOR.action;
          ctx.lineWidth = 3;
          circle(ctx, ccx, ccy, rad);
          ctx.stroke();
        }
      });
    }
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    statusPill();
    drawFiles();
    drawPreview();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    // only the build scene animates: files land one at a time. Every other
    // scene snaps to a consistent state in setScene, so the status pill, the
    // file list, and the preview never disagree mid-fill.
    if (scene === "build" && prog < progTarget) {
      prog = Math.min(progTarget, prog + dt * 1.3);
    }
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);

  // ignore a scroll-jitter re-fire of the active scene
  let cur = "";
  function setScene(id: string) {
    if (id === cur) return;
    cur = id;
    scene = id;
    if (id === "intro" || id === "plan") {
      progTarget = 0;
      prog = 0;
      fixed = false;
    } else if (id === "build") {
      progTarget = 3;
      prog = 0; // animate the files landing one at a time
      fixed = false;
    } else if (id === "check") {
      progTarget = 3;
      prog = 3;
      fixed = true;
    } else if (id === "play") {
      progTarget = 3;
      prog = 3;
      fixed = false;
    }
    if (reduce) prog = progTarget;
    render();
  }

  observeScenes(setScene);
  if (reduce) render();
}

// the real, playable tic-tac-toe game — the artifact the demo "built"
function initBoard(): void {
  const root = document.getElementById("ttt");
  if (!root) return;
  const cells = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-cell]"),
  );
  const statusEl = root.querySelector<HTMLElement>("#ttt-status");
  const reset = root.querySelector<HTMLButtonElement>("#ttt-reset");
  if (!statusEl || !reset) return;

  const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  let board = Array<string>(9).fill("");
  let turn = "X";
  let over = false;

  function winner(): string | null {
    for (const [a, b, c] of LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return board.every(Boolean) ? "draw" : null;
  }

  function paint() {
    cells.forEach((c, i) => {
      c.textContent = board[i];
      c.classList.toggle("x", board[i] === "X");
      c.classList.toggle("o", board[i] === "O");
      c.disabled = over || board[i] !== "";
    });
    const w = winner();
    if (w === "draw") statusEl!.textContent = "A draw — press reset";
    else if (w) statusEl!.textContent = `${w} wins — press reset`;
    else statusEl!.textContent = `${turn} to move`;
  }

  cells.forEach((c, i) => {
    c.addEventListener("click", () => {
      if (over || board[i]) return;
      board[i] = turn;
      const w = winner();
      if (w) over = true;
      else turn = turn === "X" ? "O" : "X";
      paint();
    });
  });
  reset.addEventListener("click", () => {
    board = Array<string>(9).fill("");
    turn = "X";
    over = false;
    paint();
  });
  paint();
}
