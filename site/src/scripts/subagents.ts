// Subagents — canvas controller. The main agent hands a big or separate chunk
// of work to a helper agent that has its own fresh context. The helper does the
// work and returns just the answer, so the main agent's window stays clean — and
// independent parts can run at the same time. Built on ./kit.

import {
  COLOR,
  clamp,
  glow,
  hexA,
  lerp,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  SANS,
  MONO,
} from "./kit";

interface Sub {
  label: string;
  fill: number;
  target: number;
  returned: boolean;
}

type Mode = "solo" | "isolate" | "return" | "parallel";

export function initSubagents(): void {
  const s = makeSurface("sa-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  let mode: Mode = "solo";
  let mainFill = 0;
  let mainTarget = 0.92;
  let subs: Sub[] = [];
  let tphase = 0; // 0..1 travelling-token phase

  function setMode(m: Mode) {
    mode = m;
    if (m === "solo") {
      mainTarget = 0.92;
      subs = [];
    } else if (m === "isolate") {
      mainTarget = 0.3;
      subs = [
        {
          label: "Search the codebase",
          fill: 0,
          target: 0.82,
          returned: false,
        },
      ];
    } else if (m === "return") {
      mainTarget = 0.38;
      subs = [
        { label: "Search the codebase", fill: 0, target: 0.82, returned: true },
      ];
    } else {
      mainTarget = 0.4;
      subs = [
        { label: "Check the backend", fill: 0, target: 0.78, returned: true },
        { label: "Check the frontend", fill: 0, target: 0.7, returned: true },
        { label: "Check the tests", fill: 0, target: 0.84, returned: true },
      ];
    }
    if (reduce) {
      mainFill = mainTarget;
      subs.forEach((x) => (x.fill = x.target));
      render();
    }
  }

  function gaugeColor(f: number): string {
    if (f < 0.6) return COLOR.verified;
    if (f < 0.85) return COLOR.action;
    return COLOR.risk;
  }

  // an agent box with a title and a small context gauge along the bottom
  function agentBox(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    fill: number,
    big: boolean,
  ) {
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.09)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 13);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 13);
    ctx.strokeStyle = big ? hexA(COLOR.context, 0.5) : COLOR.hairStrong;
    ctx.lineWidth = big ? 1.8 : 1.3;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.ink;
    ctx.font = `650 ${big ? 14 : 13}px ${SANS}`;
    ctx.fillText(title, x + 14, y + 24);

    // context gauge
    const gx = x + 14;
    const gw = w - 28;
    const gy = y + h - 26;
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 10px ${MONO}`;
    ctx.fillText("CONTEXT", gx, gy - 6);
    roundRect(ctx, gx, gy, gw, 8, 4);
    ctx.fillStyle = COLOR.hair;
    ctx.fill();
    const f = clamp(fill, 0, 1);
    if (f > 0.01) {
      roundRect(ctx, gx, gy, gw * f, 8, 4);
      ctx.fillStyle = gaugeColor(f);
      ctx.fill();
    }
  }

  // a link main↔sub: amber task going out, green result coming back, with a dot
  function link(mx: number, my: number, sx: number, sy: number, sub: Sub) {
    const out = !sub.returned;
    const c = out ? COLOR.action : COLOR.verified;
    ctx.strokeStyle = hexA(c, 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // travelling dot: out = main→sub, returned = sub→main
    const p = out ? tphase : 1 - tphase;
    const dx = lerp(mx, sx, p);
    const dy = lerp(my, sy, p);
    glow(ctx, dx, dy, 9, c, 0.5);
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();

    // arrowhead at the destination end
    const ang = Math.atan2(out ? sy - my : my - sy, out ? sx - mx : mx - sx);
    const ex = out ? sx : mx;
    const ey = out ? sy : my;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    const pad = 22;
    const mainW = Math.min(size.w * 0.4, 168);
    const mainH = 92;
    const mainX = pad;
    const mainY = size.h / 2 - mainH / 2;
    const mcx = mainX + mainW;
    const mcy = mainY + mainH / 2;

    const subW = Math.min(size.w * 0.42, 170);
    const subX = size.w - pad - subW;
    const subH = 72;

    if (subs.length > 0) {
      const gap = 18;
      const totalH = subs.length * subH + (subs.length - 1) * gap;
      let y = size.h / 2 - totalH / 2;
      subs.forEach((sub) => {
        const scy = y + subH / 2;
        // link first so boxes draw over the line ends
        link(mcx + 4, mcy, subX - 4, scy, sub);
        agentBox(subX, y, subW, subH, sub.label, sub.fill, false);
        y += subH + gap;
      });
    }

    agentBox(mainX, mainY, mainW, mainH, "Main agent", mainFill, true);

    // a caption under the main box for the solo case (no helpers yet)
    if (mode === "solo") {
      ctx.textAlign = "left";
      ctx.fillStyle = COLOR.inkFaint;
      ctx.font = `500 12px ${SANS}`;
      ctx.fillText("doing it all itself", mainX, mainY + mainH + 22);
    }
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    mainFill += (mainTarget - mainFill) * Math.min(1, dt * 3);
    subs.forEach(
      (x) => (x.fill += (x.target - x.fill) * Math.min(1, dt * 2.4)),
    );
    tphase += dt * 0.6;
    if (tphase > 1) tphase -= 1;
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);

  // ignore a scroll-jitter re-fire of the active scene so a pick doesn't reset
  let curScene = "";
  function setScene(id: string) {
    if (id === curScene) return;
    curScene = id;
    if (id === "intro") setMode("solo");
    else if (id === "isolate") setMode("isolate");
    else if (id === "return") setMode("return");
    else if (id === "parallel") setMode("parallel");
    else if (id === "try") setMode("solo");
  }

  observeScenes(setScene);
  if (reduce) {
    setMode("solo");
    render();
  }

  // ---- interactive ------------------------------------------------------
  const btns = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-mode]"),
  );
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const m = b.getAttribute("data-mode") as Mode | null;
      if (!m) return;
      btns.forEach((o) =>
        o.setAttribute("aria-pressed", o === b ? "true" : "false"),
      );
      setMode(m);
    });
  });
}
