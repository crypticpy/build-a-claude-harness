// Shared canvas + scrollytelling primitives for the Phase 1 explorables.
// Keeps every page on one visual grammar and stops each topic from
// re-implementing DPR handling, easing, the glow (a radial gradient, never a
// blur filter — guardrails ban blur), arrows, and the scroll->scene observer.

export const COLOR = {
  paper: "#FBFAF6",
  paper2: "#FFFFFF",
  ink: "#2A2620",
  inkSoft: "#6B6457",
  inkFaint: "#A39A8A",
  hair: "#E2DCD0",
  hairStrong: "#CFC7B7",
  context: "#2F6BD8",
  action: "#E0820A",
  verified: "#1F9A63",
  risk: "#D6453F",
  purple: "#7A5AF0",
  white: "#FFFFFF",
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// hex (#rrggbb) + alpha -> rgba() string.
export function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  // live CSS-pixel size, kept current by the ResizeObserver
  size: { w: number; h: number };
  // call to stop observing (rarely needed; pages are full-reload)
  stop: () => void;
}

// DPR-aware canvas wired to a ResizeObserver. The ctx transform is set so all
// drawing is in CSS pixels; read live size from the returned `size` object.
export function makeSurface(id: string): Surface | null {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const size = { w: 0, h: 0 };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.w = rect.width;
    size.h = rect.height;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  return { canvas, ctx, size, stop: () => ro.disconnect() };
}

export function prefersReducedMotion(): boolean {
  return !!(
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Wire each `.scene[data-scene]` element to a callback when it scrolls into the
// middle band of the viewport. Returns the observer for teardown.
export function observeScenes(
  onScene: (id: string) => void,
  selector = ".scene",
): IntersectionObserver {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = e.target.getAttribute("data-scene");
          if (id) onScene(id);
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
  return io;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function circle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

// A straight line with a filled arrowhead at (x2,y2).
export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  w: number,
  head = 6,
): void {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
}

// A soft round glow centered at (cx,cy), drawn as a radial gradient (no blur
// filter). Call before drawing the solid core on top.
export function glow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  strength = 0.5,
): void {
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  g.addColorStop(0, hexA(color, strength));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  circle(ctx, cx, cy, r);
  ctx.fill();
}

export const SANS =
  "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
