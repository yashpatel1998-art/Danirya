/**
 * /lab NestedStack verify — Jesko fly-through + gated stack.
 * Output: public/verify/nested-stack.webm + nested-stack.json
 */
import { chromium } from 'playwright';
import {
  mkdirSync,
  renameSync,
  copyFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'nested-stack.webm');
const logPath = join(outDir, 'nested-stack.json');
const base = process.env.VERIFY_BASE || 'http://localhost:3000';

async function lenisTo(page, targetY) {
  await page.evaluate(async (targetY) => {
    const lenis = window.__lenis;
    if (!lenis) {
      window.scrollTo(0, targetY);
      return;
    }
    lenis.resize?.();
    await new Promise((resolve) => {
      lenis.scrollTo(targetY, { immediate: true, onComplete: resolve });
      setTimeout(resolve, 200);
    });
    // Force scrubbed timelines to catch the new scroll position
    window.ScrollTrigger?.update?.();
  }, targetY);
  await page.waitForTimeout(700);
}

function parseScale(transform) {
  if (!transform || transform === 'none') return 1;
  const m = transform.match(/^matrix\(([^)]+)\)/);
  if (!m) return null;
  const a = Number(m[1].split(',')[0]);
  return Number.isFinite(a) ? a : null;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(`${base}/lab?verify=1`, {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-lab-nested-stack]', { timeout: 120000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 90000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  window.ScrollTrigger?.refresh?.();
  window.__lenis?.resize?.();
});
await page.waitForTimeout(500);

const maxY = await page.evaluate(() => {
  const lenis = window.__lenis;
  if (lenis?.limit != null) return Math.max(0, lenis.limit);
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
});
console.log('maxY', maxY);

const checkpoints = [
  { t: 0.0, label: 'start' },
  { t: 0.08, label: 'fly-early' },
  { t: 0.16, label: 'fly-mid' },
  { t: 0.24, label: 'fly-late' },
  { t: 0.32, label: 'case-breathe' },
  { t: 0.42, label: 'case-hold' },
  { t: 0.52, label: 'studio-enter' },
  { t: 0.62, label: 'studio-hold' },
  { t: 0.74, label: 'app-enter' },
  { t: 0.88, label: 'app-hold' },
  { t: 1.0, label: 'app-rest' },
];

const samples = [];
for (const cp of checkpoints) {
  await lenisTo(page, maxY * cp.t);
  const sample = await page.evaluate((label) => {
    const read = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        opacity: Number(cs.opacity),
        transform: cs.transform,
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };
    const irisLogo = document.querySelector('[data-lab-iris-logo]');
    const irisZoom = document.querySelector('[data-lab-iris-zoom]');
    const stack = document.querySelector('[data-lab-stack]');
    return {
      label,
      scrollY: Math.round(window.scrollY),
      stackOpacity: stack ? Number(getComputedStyle(stack).opacity) : null,
      irisZoom: irisZoom
        ? {
            transform: getComputedStyle(irisZoom).transform,
            opacity: Number(getComputedStyle(irisZoom).opacity),
          }
        : null,
      irisLogo: irisLogo
        ? {
            transform: getComputedStyle(irisLogo).transform,
            opacity: Number(getComputedStyle(irisLogo).opacity),
          }
        : null,
      studio: read('[data-lab-stack] [data-nest-panel="studio"]'),
      application: read('[data-lab-stack] [data-nest-panel="application"]'),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  }, cp.label);
  samples.push(sample);
  console.log(
    cp.label,
    'page',
    parseScale(sample.irisZoom?.transform),
    'pageOp',
    sample.irisZoom?.opacity,
    'logo',
    parseScale(sample.irisLogo?.transform),
    'logoOp',
    sample.irisLogo?.opacity,
    'stackOp',
    sample.stackOpacity
  );
}

writeFileSync(
  logPath,
  JSON.stringify(
    {
      maxY,
      decisions: {
        sequence: 'case-study-then-studio',
        inset: '4.5vh / 3.5vw',
        iris: 'Jesko fly-through — logo leaves viewport; no clip circle',
        stack: 'hidden until iris ends; gated holds between panels',
        mobile: 'plain-vertical ≤720px',
      },
      samples,
    },
    null,
    2
  )
);
console.log('LOG', logPath);

const video = page.video();
await page.close();
await context.close();
await browser.close();

if (video) {
  const tmp = await video.path();
  try {
    renameSync(tmp, outPath);
  } catch {
    copyFileSync(tmp, outPath);
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
  console.log('VIDEO', outPath);
} else {
  console.error('No video recorded');
  process.exit(1);
}
