/**
 * Verify: CSS-3D ring (6 even angles, no hard clip) + wave-edge scrub.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, copyFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'verify');
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'ring-wave.json');
const outPath = join(outDir, 'ring-wave.webm');

async function scrollToY(page, y, duration = 0.75) {
  await page.evaluate(
    async ({ y, duration }) => {
      const lenis = window.__lenis;
      if (!lenis) {
        window.scrollTo(0, y);
        return;
      }
      await new Promise((resolve) => {
        lenis.scrollTo(y, { duration, onComplete: resolve });
        setTimeout(resolve, duration * 1000 + 400);
      });
    },
    { y, duration }
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

await page.goto('http://localhost:3000/?verify=1', {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
});
await page.waitForSelector('[data-wave-edge]', { timeout: 180000 });
await page.waitForFunction(() => !!window.__lenis, null, { timeout: 60000 });
// Temple holds Lenis until a gesture unlocks dive — synthesize that for verify.
await page.evaluate(() => {
  document.documentElement.style.overflow = '';
  window.__lenis?.start?.();
  window.dispatchEvent(
    new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true })
  );
});
await page.waitForFunction(
  () => {
    const lenis = window.__lenis;
    if (!lenis) return false;
    const before = lenis.animatedScroll;
    lenis.scrollTo(before + 160, { immediate: true });
    const moved = Math.abs(lenis.animatedScroll - before) > 20;
    lenis.scrollTo(0, { immediate: true });
    return moved;
  },
  null,
  { timeout: 180000 }
);
await page.waitForTimeout(500);

const waveRange = await page.evaluate(() => {
  const el = document.querySelector('[data-wave-edge]');
  const lenis = window.__lenis;
  const scroll = lenis?.animatedScroll ?? window.scrollY;
  if (!el) return { start: 0, end: 0 };
  const top = el.getBoundingClientRect().top + scroll;
  const h = el.offsetHeight;
  return { start: Math.max(0, top), end: top + h };
});

// Sweep through pinned wave scrub
const waveSamples = [];
for (let i = 0; i <= 8; i++) {
  const y = waveRange.start + ((waveRange.end - waveRange.start) * i) / 8;
  await scrollToY(page, y, 0.45);
  await page.waitForTimeout(180);
  const sample = await page.evaluate(() => {
    const root = document.querySelector('[data-wave-edge]');
    const sheet = document.querySelector('[data-wave-sheet]');
    const t = sheet ? getComputedStyle(sheet).transform : null;
    const m = t && t !== 'none' ? t.match(/matrix\(([^)]+)\)/) : null;
    const ty = m ? Number(m[1].split(',')[5]) : null;
    return {
      transform: t,
      ty,
      progress: root?.getAttribute('data-wave-progress') ?? null,
    };
  });
  waveSamples.push({ i, y, ...sample });
}

await page.waitForSelector('[data-orbital-gallery]', { timeout: 60000 });
const galleryTop = await page.evaluate(() => {
  const el = document.querySelector('[data-orbital-gallery]');
  return Math.max(0, (el?.getBoundingClientRect().top ?? 0) + window.scrollY - 10);
});

await scrollToY(page, galleryTop, 0.9);
await page.waitForTimeout(500);

const geometry = await page.evaluate(() => {
  const items = [...document.querySelectorAll('[data-orbit-item]')];
  const angles = items.map((el) => Number(el.dataset.orbitAngle));
  const transforms = items.map((el) => el.style.transform || getComputedStyle(el).transform);
  const rects = items.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      l: Math.round(r.left),
      r: Math.round(r.right),
      t: Math.round(r.top),
      opacity: Number(getComputedStyle(el).opacity),
    };
  });
  const stage = document.querySelector('[data-orbital-gallery]');
  const scene = document.querySelector('[data-orbit-scene]');
  const overflow = {
    stage: stage ? getComputedStyle(stage).overflow : null,
    scene: scene ? getComputedStyle(scene).overflow : null,
    room: (() => {
      const r = document.querySelector('[data-room="gallery"]');
      return r ? getComputedStyle(r).overflow : null;
    })(),
  };
  const vw = window.innerWidth;
  const clippedHard = rects.some(
    (r) => r.opacity > 0.5 && (r.l < -2 || r.r > vw + 2) && r.w < 40
  );
  return {
    count: items.length,
    angles,
    transforms,
    rects,
    overflow,
    hasRingMarker: !!document.querySelector('[data-orbit-ring]'),
    glassGone: !document.querySelector('[data-glass-gallery]'),
    clippedHard,
  };
});

const ringSamples = [];
for (let i = 0; i <= 8; i++) {
  const y = galleryTop + i * 280;
  await scrollToY(page, y, 0.4);
  await page.waitForTimeout(160);
  const sample = await page.evaluate(() => {
    const ring = document.querySelector('[data-orbit-ring]');
    const front = document.querySelector('[data-orbit-item][data-front="true"]');
    return {
      ringTransform: ring ? getComputedStyle(ring).transform : null,
      frontCaption: front?.querySelector('h3')?.textContent ?? null,
      frontCount: document.querySelectorAll('[data-orbit-item][data-front="true"]').length,
    };
  });
  ringSamples.push({ i, y, ...sample });
}

writeFileSync(
  logPath,
  JSON.stringify({ geometry, waveSamples, ringSamples }, null, 2)
);

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
}

console.log(JSON.stringify({ logPath, outPath, geometry: { count: geometry.count, angles: geometry.angles, overflow: geometry.overflow, glassGone: geometry.glassGone } }, null, 2));
