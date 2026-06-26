// Context and memory — canvas controller. The model only knows what's in front
// of it: a stack of context cards flowing into it, measured against a fixed
// "context window" gauge. When the window fills, compaction trades the old
// detail for a short summary. The reader can add/remove cards and compact.
// Built on ./kit.

import {
  COLOR,
  arrow,
  clamp,
  hexA,
  lerp,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  SANS,
  MONO,
} from "./kit";

interface Card {
  id: string;
  label: string;
  weight: number;
  on: boolean;
  fixed?: boolean; // prompt is always present
}

function baseCards(): Card[] {
  return [
    { id: "prompt", label: "Your prompt", weight: 8, on: true, fixed: true },
    {
      id: "instructions",
      label: "Project instructions (CLAUDE.md)",
      weight: 10,
      on: true,
    },
    { id: "files", label: "Files it read", weight: 26, on: true },
    { id: "output", label: "Command output", weight: 22, on: true },
    { id: "history", label: "Earlier conversation", weight: 30, on: true },
  ];
}
const CAP = 100;

export function initContextMemory(): void {
  const s = makeSurface("cm-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let cards = baseCards();
  let compacted = false;
  let highlight: string | null = null;
  let gauge = 0; // animated fill 0..1
  let lostNote = false;

  function activeCards(): Card[] {
    if (compacted) {
      const keep = cards.filter(
        (c) => c.on && (c.id === "prompt" || c.id === "instructions"),
      );
      return [
        ...keep,
        {
          id: "summary",
          label: "Summary of earlier work",
          weight: 14,
          on: true,
        },
      ];
    }
    return cards.filter((c) => c.on);
  }

  function targetFill(): number {
    const total = activeCards().reduce((a, c) => a + c.weight, 0);
    return clamp(total / CAP, 0, 1);
  }

  function gaugeColor(f: number): string {
    if (f >= 0.85) return COLOR.risk;
    if (f >= 0.6) return COLOR.action;
    return COLOR.verified;
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    const pad = 24;

    // ---- gauge (top) ----
    const gx = pad;
    const gy = 30;
    const gw = size.w - pad * 2;
    const gh = 16;
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11.5px ${MONO}`;
    ctx.textAlign = "left";
    ctx.fillText("CONTEXT WINDOW", gx, gy - 8);
    roundRect(ctx, gx, gy, gw, gh, 8);
    ctx.fillStyle = "#F0ECE3";
    ctx.fill();
    const col = gaugeColor(gauge);
    roundRect(ctx, gx, gy, Math.max(gh, gw * gauge), gh, 8);
    ctx.fillStyle = hexA(col, 0.9);
    ctx.fill();
    ctx.textAlign = "right";
    ctx.fillStyle = col;
    ctx.font = `600 11.5px ${MONO}`;
    ctx.fillText(`${Math.round(gauge * 100)}% full`, gx + gw, gy - 8);

    // ---- cards stack (left) flowing into model (right) ----
    const list = activeCards();
    const colX = pad;
    const colW = Math.min(size.w * 0.52, 300);
    const top = gy + gh + 34;
    const cardH = 38;
    const gapY = 10;
    const modelX = size.w - pad - Math.min(120, size.w * 0.22);
    const modelCX = modelX + Math.min(120, size.w * 0.22) / 2;
    const modelCY = top + (list.length * (cardH + gapY)) / 2 - gapY / 2;

    list.forEach((c, i) => {
      const y = top + i * (cardH + gapY);
      const hot = highlight === c.id;
      const isSummary = c.id === "summary";
      roundRect(ctx, colX, y, colW, cardH, 10);
      ctx.fillStyle = isSummary
        ? hexA(COLOR.ink, 0.04)
        : hexA(COLOR.context, hot ? 0.16 : 0.08);
      ctx.fill();
      roundRect(ctx, colX, y, colW, cardH, 10);
      ctx.strokeStyle = hot
        ? COLOR.context
        : isSummary
          ? COLOR.hairStrong
          : hexA(COLOR.context, 0.4);
      ctx.lineWidth = hot ? 2 : 1.3;
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = isSummary ? COLOR.inkSoft : COLOR.ink;
      ctx.font = `${hot ? "650" : "550"} 13px ${SANS}`;
      ctx.fillText(c.label, colX + 13, y + cardH / 2 + 4.5);
      // flow line into model
      ctx.globalAlpha = 0.45;
      arrow(
        ctx,
        colX + colW + 3,
        y + cardH / 2,
        modelX - 6,
        modelCY,
        hexA(COLOR.context, 0.6),
        1.2,
        5,
      );
      ctx.globalAlpha = 1;
    });

    // model box
    const mW = Math.min(120, size.w * 0.22);
    const mH = 64;
    roundRect(ctx, modelX, modelCY - mH / 2, mW, mH, 14);
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, modelX, modelCY - mH / 2, mW, mH, 14);
    ctx.strokeStyle = COLOR.hairStrong;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = COLOR.ink;
    ctx.font = `650 14px ${SANS}`;
    ctx.fillText("Model", modelCX, modelCY - 2);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11px ${MONO}`;
    ctx.fillText("knows this", modelCX, modelCY + 15);

    // lost-detail note after compaction
    if (compacted && lostNote) {
      const ny = top + list.length * (cardH + gapY) + 8;
      ctx.textAlign = "left";
      ctx.fillStyle = COLOR.risk;
      ctx.font = `600 12px ${SANS}`;
      ctx.fillText(
        "Some earlier detail is gone, traded for the summary.",
        colX,
        ny + 6,
      );
    }
  }

  let raf = 0;
  function frame() {
    const t = targetFill();
    gauge = Math.abs(t - gauge) < 0.005 ? t : lerp(gauge, t, 0.18);
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);
  else {
    gauge = targetFill();
    render();
  }

  // a scroll-jitter re-fire of the same scene must not reset the reader's
  // toggles; ignore a repeat of the active scene, only a real change re-runs it.
  let curScene = "";
  function setScene(id: string) {
    if (id === curScene) return;
    curScene = id;
    highlight = null;
    lostNote = false;
    if (id === "intro") {
      cards = baseCards();
      cards.forEach(
        (c) => (c.on = c.id === "prompt" || c.id === "instructions"),
      );
      compacted = false;
    } else if (id === "stack") {
      cards = baseCards();
      compacted = false;
    } else if (id === "claudemd") {
      cards = baseCards();
      compacted = false;
      highlight = "instructions";
    } else if (id === "full") {
      cards = baseCards();
      compacted = false;
    } else if (id === "compact") {
      cards = baseCards();
      compacted = true;
      lostNote = true;
    } else if (id === "try") {
      cards = baseCards();
      compacted = false;
    }
    if (reduce) {
      gauge = targetFill();
      render();
    }
  }

  observeScenes(setScene);

  // ---- interactive ------------------------------------------------------
  const toggles = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-card]"),
  );
  function syncToggles() {
    toggles.forEach((b) => {
      const id = b.getAttribute("data-card");
      const c = cards.find((x) => x.id === id);
      b.setAttribute(
        "aria-pressed",
        c && c.on && !compacted ? "true" : "false",
      );
    });
  }
  toggles.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-card");
      const c = cards.find((x) => x.id === id);
      if (!c || c.fixed) return;
      compacted = false;
      lostNote = false;
      c.on = !c.on;
      syncToggles();
      if (reduce) {
        gauge = targetFill();
        render();
      }
    });
  });
  const compactBtn = document.getElementById("cm-compact");
  compactBtn?.addEventListener("click", () => {
    compacted = !compacted;
    lostNote = compacted;
    syncToggles();
    if (reduce) {
      gauge = targetFill();
      render();
    }
  });
  syncToggles();
}
