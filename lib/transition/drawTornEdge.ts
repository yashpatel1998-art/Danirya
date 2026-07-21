/**
 * Editions-style fibrous torn paper edge (canvas-2D).
 * Shared by live WaveEdge and /lab continuous scroll.
 */

export type TornEdgeColors = {
  cream?: string;
  creamHi?: string;
};

export function drawTornEdge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: number,
  breathe: number,
  colors: TornEdgeColors = {}
) {
  const cream = colors.cream ?? '#e6dcc8';
  const creamHi = colors.creamHi ?? '#f3ebe0';

  const edgeY = (x: number) => {
    const u = x / (w || 1);
    const base = h * 0.55;
    const p = phase;

    const broad =
      Math.sin(u * Math.PI * 1.8 + p * 2.2 + breathe * 0.15) * h * 0.09 +
      Math.sin(u * Math.PI * 3.6 - p * 1.5) * h * 0.06;

    const jagged =
      Math.sin(u * Math.PI * 9 + p * 3) * h * 0.04 +
      Math.sin(u * Math.PI * 17 - p * 2.4) * h * 0.025 +
      Math.sin(u * Math.PI * 31 + p * 4) * h * 0.014;

    const tear =
      Math.pow(Math.max(0, Math.sin(u * Math.PI * 2.8 + p * 1.4)), 7) *
        h *
        0.18 +
      Math.pow(Math.max(0, Math.sin(u * Math.PI * 6.2 - p * 1.9)), 11) *
        h *
        0.12 +
      Math.pow(Math.max(0, Math.sin(u * Math.PI * 12.5 + p * 2.6)), 15) *
        h *
        0.07;

    const fiber = Math.sin(u * Math.PI * 64 + p * 5) * h * 0.01;

    return base + broad + jagged - tear + fiber;
  };

  ctx.clearRect(0, 0, w, h);
  const steps = Math.max(80, Math.floor(w / 4));
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    ys.push(edgeY((i / steps) * w));
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, ys[0]! - 1);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo((i / steps) * w, ys[i]! - 1);
  }
  ctx.lineTo(w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.clip();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = -12;
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(0, ys[0]!);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo((i / steps) * w, ys[i]!);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(0, ys[0]!);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo((i / steps) * w, ys[i]!);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = creamHi;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(0, ys[0]!);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo((i / steps) * w, ys[i]!);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(35, 28, 18, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ys[0]! + 1.5);
  for (let i = 1; i <= steps; i++) {
    ctx.lineTo((i / steps) * w, ys[i]! + 1.5);
  }
  ctx.stroke();
}
