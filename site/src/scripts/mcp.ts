// MCP servers — canvas controller. Claude Code's built-in tools reach your own
// computer. An MCP server is a standard way to plug in outside tools and data:
// once connected, its tools join the list the model can call, and the model
// calls them the same way it calls a built-in one. Built on ./kit.

import {
  COLOR,
  hexA,
  lerp,
  glow,
  prefersReducedMotion,
  makeSurface,
  observeScenes,
  roundRect,
  circle,
  SANS,
  MONO,
} from "./kit";

interface Server {
  id: string;
  name: string;
  tool: string; // the tool it adds to the model's reach
  desc: string;
}

const SERVERS: Server[] = [
  {
    id: "docs",
    name: "Docs",
    tool: "search_docs",
    desc: "look up library docs",
  },
  { id: "db", name: "Database", tool: "run_query", desc: "read your database" },
  {
    id: "cal",
    name: "Calendar",
    tool: "list_events",
    desc: "check your calendar",
  },
];

const BUILTINS = ["Read file", "Run command"];

export function initMcp(): void {
  const s = makeSurface("mcp-canvas");
  if (!s) return;
  const { ctx, size } = s;
  const reduce = prefersReducedMotion();

  const connected = new Set<string>();
  let activeCall: string | null = null; // server id with a call in flight
  let tphase = 0;

  function rows(): { name: string; mcp: boolean }[] {
    const r = BUILTINS.map((name) => ({ name, mcp: false }));
    SERVERS.forEach((sv) => {
      if (connected.has(sv.id)) r.push({ name: sv.tool, mcp: true });
    });
    return r;
  }

  function hubGeom() {
    const pad = 22;
    const w = Math.min(size.w * 0.42, 196);
    const h = 62 + rows().length * 26 + 12;
    const x = pad;
    const y = (size.h - h) / 2;
    return { x, y, w, h };
  }

  function drawHub() {
    const { x, y, w, h } = hubGeom();
    ctx.save();
    ctx.shadowColor = "rgba(40,38,32,0.09)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, x, y, w, h, 13);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, 13);
    ctx.strokeStyle = hexA(COLOR.context, 0.5);
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.ink;
    ctx.font = `650 14px ${SANS}`;
    ctx.fillText("Claude Code", x + 14, y + 24);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `600 10px ${MONO}`;
    ctx.fillText("TOOLS IT CAN CALL", x + 14, y + 44);

    let ry = y + 62 + 9;
    rows().forEach((r) => {
      const c = r.mcp ? COLOR.context : COLOR.inkSoft;
      circle(ctx, x + 20, ry, 3);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.fillStyle = r.mcp ? COLOR.context : COLOR.ink;
      ctx.font = `${r.mcp ? "600" : "500"} 12px ${MONO}`;
      ctx.textBaseline = "middle";
      ctx.fillText(r.name, x + 32, ry);
      ctx.textBaseline = "alphabetic";
      ry += 26;
    });
  }

  function serverGeom(i: number) {
    const pad = 22;
    const w = Math.min(size.w * 0.36, 158);
    const cardH = 56;
    const gap = 16;
    const total = SERVERS.length * cardH + (SERVERS.length - 1) * gap;
    const y0 = (size.h - total) / 2;
    const x = size.w - pad - w;
    const y = y0 + i * (cardH + gap);
    return { x, y, w, h: cardH };
  }

  function drawWire(i: number, on: boolean) {
    const hub = hubGeom();
    const sv = serverGeom(i);
    const x1 = hub.x + hub.w;
    const y1 = hub.y + hub.h / 2;
    const x2 = sv.x;
    const y2 = sv.y + sv.h / 2;
    ctx.strokeStyle = on ? hexA(COLOR.context, 0.55) : COLOR.hair;
    ctx.lineWidth = on ? 1.8 : 1.2;
    if (!on) ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // a call in flight: amber out to the server, green result back
    if (on && activeCall === SERVERS[i].id) {
      const out = tphase < 0.5;
      const p = out ? tphase * 2 : (tphase - 0.5) * 2;
      const dx = out ? lerp(x1, x2, p) : lerp(x2, x1, p);
      const dy = out ? lerp(y1, y2, p) : lerp(y2, y1, p);
      const c = out ? COLOR.action : COLOR.verified;
      glow(ctx, dx, dy, 9, c, 0.5);
      circle(ctx, dx, dy, 4);
      ctx.fillStyle = c;
      ctx.fill();
    }
  }

  function drawServer(i: number) {
    const sv = SERVERS[i];
    const { x, y, w, h } = serverGeom(i);
    const on = connected.has(sv.id);
    ctx.globalAlpha = on ? 1 : 0.55;
    roundRect(ctx, x, y, w, h, 11);
    ctx.fillStyle = COLOR.white;
    ctx.fill();
    roundRect(ctx, x, y, w, h, 11);
    ctx.strokeStyle = on ? hexA(COLOR.context, 0.6) : COLOR.hairStrong;
    ctx.lineWidth = on ? 1.7 : 1.2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.ink;
    ctx.font = `650 13px ${SANS}`;
    ctx.fillText(sv.name, x + 13, y + 21);
    ctx.fillStyle = COLOR.inkFaint;
    ctx.font = `500 11px ${SANS}`;
    ctx.fillText(on ? sv.desc : "not connected", x + 13, y + 40);
    ctx.globalAlpha = 1;

    // a small "MCP server" tag on the connected ones
    if (on) {
      ctx.fillStyle = hexA(COLOR.context, 0.7);
      ctx.font = `600 9px ${MONO}`;
      ctx.textAlign = "right";
      ctx.fillText("MCP", x + w - 12, y + 20);
    }
  }

  function render() {
    ctx.clearRect(0, 0, size.w, size.h);
    SERVERS.forEach((sv, i) => drawWire(i, connected.has(sv.id)));
    SERVERS.forEach((_, i) => drawServer(i));
    drawHub();
  }

  let last = performance.now();
  let raf = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    tphase += dt * 0.55;
    if (tphase > 1) tphase -= 1;
    render();
    raf = requestAnimationFrame(frame);
  }
  if (!reduce) raf = requestAnimationFrame(frame);

  function set(ids: string[], call: string | null) {
    connected.clear();
    ids.forEach((id) => connected.add(id));
    activeCall = call;
    syncButtons();
    if (reduce) render();
  }

  // ignore a scroll-jitter re-fire of the active scene so a pick doesn't reset
  let curScene = "";
  function setScene(id: string) {
    if (id === curScene) return;
    curScene = id;
    if (id === "intro") set([], null);
    else if (id === "plug") set(["docs"], null);
    else if (id === "call") set(["docs"], "docs");
    else if (id === "many") set(["docs", "db", "cal"], null);
    else if (id === "try") set(["docs"], null);
  }

  observeScenes(setScene);
  if (reduce) render();

  // ---- interactive: toggle each server on/off ---------------------------
  const btns = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-server]"),
  );
  function syncButtons() {
    btns.forEach((b) => {
      const id = b.getAttribute("data-server");
      b.setAttribute(
        "aria-pressed",
        id && connected.has(id) ? "true" : "false",
      );
    });
  }
  btns.forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-server");
      if (!id) return;
      activeCall = null;
      if (connected.has(id)) connected.delete(id);
      else connected.add(id);
      syncButtons();
      if (reduce) render();
    });
  });
  syncButtons();
}
